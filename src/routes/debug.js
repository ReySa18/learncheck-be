const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const ApiError = require('../utils/ApiError');

// Simple protection middleware
const requireAdmin = (req, res, next) => {
  const adminKey = process.env.ADMIN_KEY || 'secret-admin-key';
  const headerKey = req.headers['x-admin-key'];

  if (headerKey !== adminKey) {
    return next(new ApiError(403, 'Forbidden: Invalid Admin Key'));
  }
  next();
};

router.get('/sample/:tutorial_id', requireAdmin, async (req, res, next) => {
  try {
    const { tutorial_id } = req.params;
    const filePath = path.join(__dirname, '../../debug_samples', `${tutorial_id}.json`);

    try {
      await fs.access(filePath);
    } catch (e) {
      throw new ApiError(404, `Sample for tutorial_id ${tutorial_id} not found`);
    }

    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
