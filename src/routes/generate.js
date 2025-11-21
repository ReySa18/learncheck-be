const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const dicoding = require('../services/dicodingClient');
const llm = require('../services/llmClient');
const { validateGenerateQuery } = require('../validators/generateValidator');
const ApiError = require('../utils/ApiError');

router.get('/generate', async (req, res, next) => {
  try {
    if (req.query.tutorial_id && typeof req.query.tutorial_id === 'string')
      req.query.tutorial_id = req.query.tutorial_id.trim();
    if (req.query.user_id && typeof req.query.user_id === 'string')
      req.query.user_id = req.query.user_id.trim();

    const { error, value } = validateGenerateQuery(req.query);
    if (error) return next(new ApiError(400, error.details[0].message));

    const { tutorial_id, user_id } = value;

    const tutorial = await dicoding.getTutorialContent(tutorial_id);
    const pref = await dicoding.getUserPreference(user_id);
    const questions = await llm.generateQuestionsFromContent(tutorial.content);

    // Save sample for QA
    try {
      const samplePath = path.join(__dirname, '../../debug_samples', `${tutorial_id}.json`);
      const sampleData = {
        timestamp: new Date().toISOString(),
        tutorial_id,
        questions,
      };
      await fs.writeFile(samplePath, JSON.stringify(sampleData, null, 2));
    } catch (saveErr) {
      console.warn(`Failed to save debug sample for tutorial ${tutorial_id}:`, saveErr.message);
    }

    return res.json({
      status: 'success',
      data: { tutorial_id, user_id, preferences: pref.preference || {}, questions },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
