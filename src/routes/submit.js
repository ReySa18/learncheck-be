const express = require("express");
const router = express.Router();
const { validateSubmitPayload } = require("../validators/submitValidator");
const feedbackLLM = require("../services/feedbackLLM");
const ApiError = require("../utils/ApiError");

router.post("/submit", async (req, res, next) => {
  try {
    const { error, value } = validateSubmitPayload(req.body);
    if (error) return next(new ApiError(400, error.details[0].message));

    const { tutorial_id, user_id, questions } = value;

    // Kirim data ke LLM
    const feedback = await feedbackLLM.generateFeedback(questions);

    // Hitung skor
    const correct = feedback.details.filter((d) => d.is_correct).length;
    const total = feedback.details.length;

    return res.json({
      status: "success",
      data: {
        tutorial_id,
        user_id,
        correct,
        total,
        details: feedback.details
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
