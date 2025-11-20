const axios = require('axios');
const { stripHtmlToText } = require('../utils/promptTemplates');
const { validateQuestions } = require('../validators/questionsValidator');

const cache = new Map();
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '600', 10);

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

// CHUNKING
function chunkText(text, size = 10000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

//LLM INTEGRATION
async function callLLM(prompt, retries = 3) {
  const url = `${process.env.LLM_URL}/${process.env.LLM_MODEL}:generateContent?key=${process.env.LLM_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });

    const output = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return output;

  } catch (err) {
    const status = err.response?.status;

    if ((status === 429 || status === 503) && retries > 0) {
      const delay = (4 - retries) * 2000; 
      console.warn(`Gemini error ${status}. Retry in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      return callLLM(prompt, retries - 1);
    }

    throw err;
  }
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

      console.log("CHUNK SUMMARY LEN:", clean.length);

      if (clean.length < 20) {
        console.warn("Summary too short → using fallback minimal summary.");
        summaries.push("- Materi mencakup konsep penting yang perlu dipahami.");
      } else {
        summaries.push(clean);
      }
    } catch (err) {
      console.warn("Summarization failed for a chunk:", err.message);
      summaries.push("- Materi mencakup konsep utama.");
    }
  }

  return summaries.join("\n");
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
      raw = raw.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.warn("Gagal parse JSON dari Gemini. Raw:", raw);
        throw new Error("LLM menghasilkan output tidak valid (JSON parsing gagal).");
      }

      const { error, value } = validateQuestions(parsed);

      if (!error) {
        setCache(key, value);
        return value;
      }

      console.warn("Invalid LLM shape:", error.details);
      throw new Error("LLM menghasilkan struktur soal yang tidak valid.");

    } catch (err) {
      console.warn("Error call Gemini:", err.message);
      throw new Error("Gagal menghasilkan soal dari LLM: " + err.message);
    }
  }
};