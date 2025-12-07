const ApiError = require("../utils/ApiError");
const llmClient = require("./llmClient");
const { startTimer, endTimer } = require('../utils/timeLogger');

module.exports = {
  async generateFeedback(questions) {
    const prompt = `
You are an educational assistant who generates feedback for multiple-choice and multiple-answer questions.
Provide clear, accurate, and easy-to-understand explanations for each question.

Below is the question data and the user's answers in JSON format:
${JSON.stringify(questions, null, 2)}

Your tasks:
1. If "correct_answer" or "user_answer" is an array, consider the question as a multiple-answer type.
2. Determine whether the user's answer is correct or incorrect.
3. For multiple-answer questions, the answer is correct if both sets match exactly (order does not matter).
4. If any selected answer is incorrect or any required answer is missing, mark it as incorrect.
5. Provide short but accurate explanations.
6. Do not add information that is not present in the input.
7. For each "explanation", write the explanation in HTML format.
8. Use only the tags: <p>, <b>, <i>, <ul>, <ol>, <li>, <br>.
9. The explanation must use the same language as the content provided in the JSON above.

Berikan output dalam format JSON berikut:

{
  "details": [
    {
      "id": number,
      "is_correct": boolean,
      "explanation": "explanation..."
    }
  ]
}
    `;

    const timer = startTimer("Generate Feedback");

    // Call LLM
    let raw = await llmClient.callLLM(prompt, "LLM Generate Feedback");

    endTimer(timer);
    
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
