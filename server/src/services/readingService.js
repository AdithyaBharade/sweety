const prisma = require('../lib/prisma');
const { SLOT_LABELS, MAX_READINGS_PER_DAY } = require('../utils/slots');
const { toDbDate, fromDbDate } = require('../utils/dates');
const {
  conflict,
  notFound,
  PRISMA_UNIQUE_VIOLATION,
  PRISMA_RECORD_NOT_FOUND,
} = require('../utils/errors');

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
    throw conflict(`You can add only ${MAX_READINGS_PER_DAY} readings per day.`, 'date');
  }
  if (sameDay.some((r) => r.slot === slot)) {
    throw duplicateSlotError(slot);
  }
}

const readingNotFound = () => notFound('Reading not found.');

/**
 * Turns database race conditions into the same friendly errors as the checks above:
 *  - P2002: two requests raced past assertDayRules; the unique (userId, date, slot) index
 *    rejected the second one.
 *  - P2025: the reading was deleted (or is not ours) between the check and the write.
 */
async function withDbGuards(slot, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === PRISMA_UNIQUE_VIOLATION && slot) throw duplicateSlotError(slot);
    if (err.code === PRISMA_RECORD_NOT_FOUND) throw readingNotFound();
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
  const reading = await withDbGuards(input.slot, () =>
    prisma.reading.create({
      data: { userId, date: toDbDate(input.date), slot: input.slot, value: input.value },
    })
  );
  return serialize(reading);
}

async function getOwnedReading(userId, id) {
  // Filtering by userId means another user's reading looks exactly like a missing one.
  const reading = await prisma.reading.findFirst({ where: { id, userId } });
  if (!reading) throw readingNotFound();
  return reading;
}

async function updateReading(userId, id, input) {
  // Check ownership first so another user's id gets a 404, not a day-rule error.
  await getOwnedReading(userId, id);
  await assertDayRules(userId, input, id);
  const reading = await withDbGuards(input.slot, () =>
    prisma.reading.update({
      // userId in the write itself, so ownership holds even if the row changed meanwhile.
      where: { id, userId },
      data: { date: toDbDate(input.date), slot: input.slot, value: input.value },
    })
  );
  return serialize(reading);
}

async function deleteReading(userId, id) {
  // One atomic statement: deletes only if the reading exists and belongs to this user.
  await withDbGuards(null, () => prisma.reading.delete({ where: { id, userId } }));
}

module.exports = { serialize, listReadings, createReading, updateReading, deleteReading };
