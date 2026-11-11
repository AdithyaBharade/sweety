const express = require('express');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { isValidDateString, todayInTimeZone } = require('../utils/dates');
const { badRequest } = require('../utils/errors');
const { getReports } = require('../services/reportService');

const router = express.Router();
router.use(requireAuth);

// GET /api/reports?date=2026-10-15  (defaults to today)
router.get('/', async (req, res) => {
  const today = todayInTimeZone(config.timeZone);
  const date = req.query.date || today;
  if (!isValidDateString(date)) throw badRequest('Date must be a valid date (YYYY-MM-DD).', 'date');
  if (date > today) throw badRequest('Date cannot be in the future.', 'date');

  res.json(await getReports(req.userId, date));
});

module.exports = router;
