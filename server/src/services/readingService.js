const prisma = require('../lib/prisma');
const { SLOT_LABELS, MAX_READINGS_PER_DAY } = require('../utils/slots');
const { toDbDate, fromDbDate } = require('../utils/dates');
const { badRequest, conflict, notFound } = require('../utils/errors');

/** Shape returned to the client. */
function serialize(reading) {
  return {
    id: reading.id,
    date: fromDbDate(reading.date),
    slot: reading.slot,
    slotLabel: SLOT_LABELS[reading.slot],
    value: reading.value,
    createdAt: reading.createdAt,
    updatedAt: reading.updatedAt,
  };
}

const withArticle = (label) => (/^[aeiou]/i.test(label) ? `an ${label}` : `a ${label}`);

// e.g. "You already have an After lunch reading for this date."
const duplicateSlotError = (slot) =>
  conflict(`You already have ${withArticle(SLOT_LABELS[slot])} reading for this date.`, 'slot');

/**
 * Checks the per-day rules against what is already stored.
 * `excludeId` is the reading being edited, so it does not clash with itself.
 */
async function assertDayRules(userId, { date, slot }, excludeId) {
  const sameDay = await prisma.reading.findMany({
    where: { userId, date: toDbDate(date), NOT: excludeId ? { id: excludeId } : undefined },
    select: { slot: true },
  });

  if (sameDay.length >= MAX_READINGS_PER_DAY) {
    throw badRequest(`You can add only ${MAX_READINGS_PER_DAY} readings per day.`, 'date');
  }
  if (sameDay.some((r) => r.slot === slot)) {
    throw duplicateSlotError(slot);
  }
}

/**
 * The unique (userId, date, slot) index is the final safety net: if two requests
 * race past assertDayRules, Postgres rejects the second one with P2002.
 */
async function withUniqueGuard(slot, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === 'P2002') throw duplicateSlotError(slot);
    throw err;
  }
}

async function listReadings(userId, { page, limit, from, to }) {
  const where = { userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = toDbDate(from);
    if (to) where.date.lte = toDbDate(to);
  }

  const [total, rows] = await prisma.$transaction([
    prisma.reading.count({ where }),
    prisma.reading.findMany({
      where,
      orderBy: [{ date: 'desc' }, { slot: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: rows.map(serialize),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function createReading(userId, input) {
  await assertDayRules(userId, input);
  const reading = await withUniqueGuard(input.slot, () =>
    prisma.reading.create({
      data: { userId, date: toDbDate(input.date), slot: input.slot, value: input.value },
    })
  );
  return serialize(reading);
}

async function getOwnedReading(userId, id) {
  // Filtering by userId means another user's reading looks exactly like a missing one.
  const reading = await prisma.reading.findFirst({ where: { id, userId } });
  if (!reading) throw notFound('Reading not found.');
  return reading;
}

async function updateReading(userId, id, input) {
  await getOwnedReading(userId, id);
  await assertDayRules(userId, input, id);
  const reading = await withUniqueGuard(input.slot, () =>
    prisma.reading.update({
      where: { id },
      data: { date: toDbDate(input.date), slot: input.slot, value: input.value },
    })
  );
  return serialize(reading);
}

async function deleteReading(userId, id) {
  await getOwnedReading(userId, id);
  await prisma.reading.delete({ where: { id } });
}

module.exports = { serialize, listReadings, createReading, updateReading, deleteReading };
