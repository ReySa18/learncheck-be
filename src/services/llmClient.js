const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { stripHtmlToText } = require('../utils/promptTemplates');
const { validateQuestions } = require('../validators/questionsValidator');
const ApiError = require('../utils/ApiError');

const cache = new Map();
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '600', 10);

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
async function callLLM(prompt) {
  // Gunakan header x-goog-api-key untuk auth
  const url = `${process.env.LLM_URL}/${process.env.LLM_MODEL}:generateContent`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const response = await llmClient.post(url, body, {
    headers: {
      'x-goog-api-key': process.env.LLM_API_KEY,
    },
  });

  const output = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return output;
}
// SUMMARIZATION
async function summarizeLongText(rawText) {
  const chunks = chunkText(rawText);
  const summaries = [];

  for (const chunk of chunks) {
    const prompt = `
Anda adalah asisten akademik. Tugas Anda: merangkum materi berikut menjadi poin-poin penting.

PERSYARATAN OUTPUT:
- Minimal 5 poin.
- Setiap poin maksimal 1 kalimat.
- Tidak boleh mencampur instruksi, hanya merangkum materi.
- Format output: bullet list:
- Poin 1
- Poin 2
- Poin 3
- Poin 4
- Poin 5

Materi:
${chunk}
    `;

    try {
      const summary = await callLLM(prompt);
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
Anda adalah generator soal untuk aplikasi LearnCheck.
Tugas: Buat 3 - 5 soal (berdasarkan tingkat kesulitan materi) multiple-choice berdasarkan ringkasan materi berikut.

FORMAT OUTPUT WAJIB:
Hanya JSON array:
[
  {
    "id": "q1",
    "question": "teks",
    "choices": ["A","B","C","D"],
    "correct_index": 0,
    "hint": "teks hint"
  }
]

Tidak boleh ada teks lain di luar JSON.

Materi Ringkas:
${summarizedText}
    `;

    try {
      let raw = await callLLM(prompt);

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
};
