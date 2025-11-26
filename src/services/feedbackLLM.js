const ApiError = require("../utils/ApiError");
const llmClient = require("./llmClient");

module.exports = {
  async generateFeedback(questions) {
    const prompt = `
Anda adalah asisten edukasi yang membuat feedback dari jawaban soal pilihan ganda dan pilihan ganda lebih dari satu jawaban (multiple answer).
Berikan penjelasan yang jelas, akurat, dan mudah dipahami untuk setiap soal.

Berikut data soal dan jawaban user dalam format JSON:
${JSON.stringify(questions, null, 2)}

Tugas Anda:
1. Jika "correct_answer" atau "user_answer" berupa array, anggap soal tersebut adalah multiple answer.
2. Tentukan apakah jawaban user benar atau salah.
3. Jawaban benar jika SET kedua array sama (urutan tidak penting).
4. Jika salah satu jawaban tidak sesuai, kategorikan sebagai salah.
5. Berikan penjelasan singkat namun akurat.
6. Jangan menambah informasi yang tidak ada di input.
7. Untuk setiap "explanation", berikan penjelasan dalam format HTML
8. gunakan tag <p>, <b>, <i>, <ul>, <ol>, <li>, <br>.

Berikan output dalam format JSON berikut:

{
  "details": [
    {
      "id": number,
      "is_correct": boolean,
      "explanation": "penjelasan..."
    }
  ]
}
    `;

    // Call LLM
    let raw = await llmClient.callLLM(prompt);

    // Bersihkan JSON dari markdown
    let clean = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");

    if (first !== -1 && last !== -1) {
      clean = clean.substring(first, last + 1);
    }

    // Parse JSON hasil LLM
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      throw new ApiError(502, "LLM menghasilkan JSON feedback tidak valid.");
    }

    // Validasi JSON
    if (!parsed.details || !Array.isArray(parsed.details)) {
      throw new ApiError(502, "Struktur feedback LLM tidak valid.");
    }

    return parsed;
  }
};
