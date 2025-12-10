const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { stripHtmlToText } = require('../utils/promptTemplates');
const { validateQuestions } = require('../validators/questionsValidator');
const ApiError = require('../utils/ApiError');

const cache = new Map();
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '600', 10);
const { startTimer, endTimer } = require('../utils/timeLogger');

const llmClient = axios.create({
  timeout: 30000, // 30 detik timeout
  headers: { 'Content-Type': 'application/json' },
});

axiosRetry(llmClient, {
  retries: 2, // Buat coba ulangi 2 kali
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Ulangi ketika masalah jaringan, 429 (Too Many Requests), atau status kode 5xx
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response && (error.response.status === 429 || error.response.status >= 500))
    );
  },
});

function setCache(key, value) {
  const expireAt = Date.now() + CACHE_TTL * 1000;
  cache.set(key, { value, expireAt });
}

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expireAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function chunkText(text, size = 12000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// LLM INTEGRATION
async function callModel(model, apiKey, prompt) {
  const url = `${process.env.LLM_URL}/${model}:generateContent`;
  console.log(`\n[LLM] → Calling model: ${model}`);
  const start = Date.now();

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const response = await llmClient.post(url, body, {
      headers: { 'x-goog-api-key': apiKey },
    });

    const duration = Date.now() - start;
    console.log(`[LLM] ✓ Model success: ${model} (${duration} ms)`);

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    const duration = Date.now() - start;
    const status = err?.response?.status;

    console.warn(
      `[LLM] ✗ Model failed: ${model} | Status: ${status || 'network error'} | Time: ${duration} ms`
    );

    throw err;
  }
}


async function callLLM(prompt) {
  const primaryModel = process.env.LLM_MODEL_PRIMARY || process.env.LLM_MODEL;
  const primaryKey = process.env.LLM_API_KEY_PRIMARY || process.env.LLM_API_KEY;

  const secondaryModel = process.env.LLM_MODEL_SECONDARY;
  const secondaryKey = process.env.LLM_API_KEY_SECONDARY;

  console.log(`\n[LLM] === Starting LLM Request ===`);
  console.log(`[LLM] Primary model: ${primaryModel}`);
  if (secondaryModel) console.log(`[LLM] Fallback model: ${secondaryModel}`);

  try {
    // Coba model utama
    const result = await callModel(primaryModel, primaryKey, prompt);
    console.log(`[LLM] → Request completed using PRIMARY model.\n`);
    return result;

  } catch (err) {
    const status = err?.response?.status;
    const retriable = !status || [403, 429, 500, 502, 503, 504].includes(status);

    console.warn(`[LLM] Primary model failed (status: ${status}).`);

    if (!retriable || !secondaryModel || !secondaryKey) {
      console.warn(`[LLM] No fallback executed.\n`);
      throw err;
    }

    console.warn(`[LLM] → Switching to fallback model: ${secondaryModel}`);

    try {
      const result = await callModel(secondaryModel, secondaryKey, prompt);
      console.log(`[LLM] → Request completed using FALLBACK model.\n`);
      return result;

    } catch (fallbackErr) {
      console.error(`[LLM] Fallback model ALSO failed. Aborting request.\n`);
      throw new ApiError(
        502,
        'Semua model LLM gagal merespons. Silakan coba beberapa saat lagi.'
      );
    }
  }
}



// SUMMARIZATION
async function summarizeLongText(rawText) {
  const chunks = chunkText(rawText);
  const summaries = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const prompt = `
You are an academic assistant. Your task: summarize the following material into key points.

OUTPUT REQUIREMENTS:
- At least 5 points.
- Each point max 1 sentence.
- Do not mix instructions; only summarize the material.
- Summary output must use the same language as the material.
- Output format: bullet list:
- Point 1
- Point 2
- Point 3
- etc.

Material:
${chunk}
    `;

    try {
      const summary = await callLLM(prompt, `LLM Summarize Chunk ${i + 1}/${chunks.length}`);
      const clean = summary.trim();

      console.log('CHUNK SUMMARY LEN:', clean.length);

      if (clean.length < 20) {
        console.warn('Summary too short → using fallback minimal summary.');
        summaries.push('- Materi mencakup konsep penting yang perlu dipahami.');
      } else {
        summaries.push(clean);
      }
    } catch (_err) {
      console.warn('Summarization failed for a chunk:', _err.message);
      summaries.push('- Materi mencakup konsep utama.');
    }
  }

  return summaries.join('\n');
}

module.exports = {
  async generateQuestionsFromContent(htmlContent) {
    const key = `q_${(htmlContent || '').slice(0, 1000)}`;
    const cached = getCache(key);
    if (cached) return cached;

    const rawText = stripHtmlToText(htmlContent || '');

    const summarizedText = await summarizeLongText(rawText);

    const prompt = `
You are a question generator for the LearnCheck application.
Task: Create 3–5 questions (based on the difficulty of the material) using the following summarized material.

Required question types:
- Multiple choice (one correct answer)
- Multiple answer (more than one correct answer)

MANDATORY OUTPUT FORMAT:
JSON array only:
[
  {
    "id": "q1",
    "question": "text",
    "choices": ["A","B","C","D",etc],
    // For single answer → integer (index), for multiple answer → array of indexes
    "correct_index": 0,
    "hint": "hint text"
  }
]

-No text allowed outside the JSON.
- Question must use the same language as the material.
-"correct_index" may be an integer (single) or an array of integers (multiple answer).
-At least 1 multiple-answer question.
-Number of choices: 4 for multiple choice, or 4–6 for multiple answer.

Summarized Material:
${summarizedText}
    `;

    try {
      let raw = await callLLM(prompt, "LLM Generate Questions");

      // Parse dan bersihkan output LLM
      let clean = raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const firstBracket = clean.indexOf('[');
      const lastBracket = clean.lastIndexOf(']');

      if (firstBracket !== -1 && lastBracket !== -1) {
        clean = clean.substring(firstBracket, lastBracket + 1);
      }

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch (_err) {
        console.warn('Gagal parse JSON dari Gemini. Raw:', raw);
        throw new Error('LLM menghasilkan output tidak valid (JSON parsing gagal).');
      }

      const { error, value } = validateQuestions(parsed);

      if (!error) {
        setCache(key, value);
        return value;
      }

      console.warn('Invalid LLM shape:', error.details);
      throw new ApiError(502, 'LLM menghasilkan struktur soal yang tidak valid.');
    } catch (err) {
      console.warn('Error call Gemini:', err.message);
      if (err instanceof ApiError) throw err;
      throw new ApiError(502, 'Gagal menghasilkan soal dari LLM: ' + err.message);
    }
  },
  callLLM
};
