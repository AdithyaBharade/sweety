const express = require('express');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { validateReadingInput } = require('../utils/validation');
const { isValidDateString, todayForRequest } = require('../utils/dates');
const { badRequest, notFound, MAX_INT } = require('../utils/errors');
const service = require('../services/readingService');

const router = express.Router();
router.use(requireAuth);

const MAX_LIMIT = 100;

function parsePositiveInt(raw, fallback, name) {
  if (raw === undefined || raw === '') return fallback;
  const n = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > MAX_INT) {
    throw badRequest(`"${name}" must be a positive whole number.`, name);
  }
  return n;
}

function parseId(raw) {
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  // Anything that can't be a real row id is simply "not found".
  if (!Number.isInteger(id) || id < 1 || id > MAX_INT) throw notFound('Reading not found.');
  return id;
}

function parseOptionalDate(raw, name) {
  if (raw === undefined || raw === '') return undefined;
  if (!isValidDateString(raw)) throw badRequest(`"${name}" must be a date (YYYY-MM-DD).`, name);
  return raw;
}

// GET /api/readings?page=1&limit=20&from=2026-10-01&to=2026-10-31
router.get('/', async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1, 'page');
  const limit = Math.min(parsePositiveInt(req.query.limit, 20, 'limit'), MAX_LIMIT);
  // Keep the row offset inside the range Postgres/Prisma accept.
  if ((page - 1) * limit > MAX_INT) throw badRequest('"page" is too large.', 'page');
  const from = parseOptionalDate(req.query.from, 'from');
  const to = parseOptionalDate(req.query.to, 'to');
  if (from && to && from > to) throw badRequest('"from" must be on or before "to".', 'from');
  res.json(await service.listReadings(req.userId, { page, limit, from, to }));
});

router.post('/', async (req, res) => {
  const input = validateReadingInput(req.body, todayForRequest(req, config.timeZone));
  res.status(201).json(await service.createReading(req.userId, input));
});

router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const input = validateReadingInput(req.body, todayForRequest(req, config.timeZone));
  res.json(await service.updateReading(req.userId, id, input));
});

router.delete('/:id', async (req, res) => {
  await service.deleteReading(req.userId, parseId(req.params.id));
  res.status(204).end();
});

module.exports = router;
