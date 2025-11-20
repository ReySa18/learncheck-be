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

function fallbackQuestions() {
  return [
    {
      id: 'q1',
      question: 'Contoh: Apa topik utama materi di atas?',
      choices: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
      correct_index: 0,
      hint: 'Perhatikan paragraf pertama',
    },
    {
      id: 'q2',
      question: 'Contoh: Mana yang bukan termasuk?',
      choices: ['A', 'B', 'C', 'D'],
      correct_index: 2,
      hint: 'Telusuri definisi',
    },
    {
      id: 'q3',
      question: 'Contoh: Fungsi dari X adalah?',
      choices: ['1', '2', '3', '4'],
      correct_index: 1,
      hint: 'Lihat bagian akhir',
    },
  ];
}

//LLM INTEGRATION
async function callLLM(prompt) {
  const url = `${process.env.LLM_URL}/${process.env.LLM_MODEL}:generateContent?key=${process.env.LLM_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  const response = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const output = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return output;
}

module.exports = {
  async generateQuestionsFromContent(htmlContent) {
    const key = `q_${(htmlContent || '').slice(0, 1000)}`;
    const cached = getCache(key);
    if (cached) return cached;

    // Convert materi jadi teks bersih
    const text = stripHtmlToText(htmlContent || '');

    // Build Prompt
    const prompt = `
Anda adalah generator soal untuk aplikasi LearnCheck.
Tugas Anda: membuat 3-5 (sesuaikan berdasarkan tingkat kesulitan dan banyaknya keypoint materi) soal multiple-choice (pilihan ganda) berdasarkan materi berikut.

Persyaratan format output (WAJIB):
- Format output berupa JSON array.
- Setiap elemen memiliki struktur:
  {
    "id": "q1 atau q2 atau q3",
    "question": "teks pertanyaan",
    "choices": ["A", "B", "C", "D"],
    "correct_index": 0-3,
    "hint": "petunjuk singkat"
  }
- Tidak boleh mengembalikan teks lain di luar JSON.
- Semua pilihan harus relevan.
- Soal harus berdasarkan materi di bawah.
- Hint tidak boleh membocorkan jawaban.

Materi:
${text}
		`;

    try {
      // 2. Call Gemini
      let raw = await callLLM(prompt);

      // Bersihkan block code kalau ada
      raw = raw.replace(/```json|```/g, '').trim();

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.warn('Gagal parse JSON dari Gemini. Raw:', raw);
        return fallbackQuestions();
      }

      // 3. Validasi dengan Joi
      const { error, value } = validateQuestions(parsed);
      if (!error) {
        setCache(key, value);
        return value;
      }

      console.warn('Shape LLM invalid:', error.details);
      return fallbackQuestions();
    } catch (err) {
      console.warn('Error call Gemini:', err.message);
      return fallbackQuestions();
    }
  },
};
