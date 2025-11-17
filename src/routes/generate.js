const express = require('express');
const router = express.Router();
const dicoding = require('../services/dicodingClient');
const llm = require('../services/llmClient');
const { validateGenerateQuery } = require('../validators/generateValidator');

router.get('/generate', async (req, res) => {
  try {
    const { error, value } = validateGenerateQuery(req.query);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }
    const { tutorial_id, user_id } = value;

    // 1. ambil materi dari mock dicoding
    const tutorial = await dicoding.getTutorialContent(tutorial_id);

    // 2. ambil preference user
    const pref = await dicoding.getUserPreference(user_id);

    // 3. panggil LLM untuk generate soal
    const questions = await llm.generateQuestionsFromContent(tutorial.content);

    // 4. format response
    return res.json({
      status: 'success',
      data: {
        tutorial_id,
        user_id,
        preferences: pref.preference || {},
        questions,
      },
    });
  } catch (err) {
    console.error('=== ERROR in /api/generate ===');
    console.error('err.message =', err && err.message);
    if (err.response) {
      console.error('err.response.status =', err.response.status);
      console.error('err.response.data =', JSON.stringify(err.response.data, null, 2));
    }
    if (err.stack) console.error(err.stack);

    return res.status(500).json({ status: 'error', message: 'internal server error', debug: err.message });
  }
});

module.exports = router;
