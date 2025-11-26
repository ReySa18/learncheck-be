const ApiError = require("../utils/ApiError");
const llmClient = require("./llmClient");

module.exports = {
  async generateFeedback(questions) {
    const prompt = `
Anda adalah asisten edukasi yang membuat feedback dari jawaban soal pilihan ganda.

Berikan penjelasan yang jelas, akurat, dan mudah dipahami untuk setiap soal.

Berikut data soal dan jawaban user dalam format JSON:
${JSON.stringify(questions, null, 2)}

Tugas Anda:
1. Tentukan apakah jawaban user benar atau salah.
2. Berikan penjelasan singkat namun padat.
3. Jangan melakukan spekulasi — gunakan data dari input.

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
