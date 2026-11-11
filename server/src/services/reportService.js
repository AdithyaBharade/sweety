const prisma = require('../lib/prisma');
const { getReportRanges, toDbDate } = require('../utils/dates');
const { toSummary } = require('../utils/stats');
const { serialize } = require('./readingService');

const rangeWhere = (userId, { from, to }) => ({
  userId,
  date: { gte: toDbDate(from), lte: toDbDate(to) },
});

const aggregateRange = (userId, range) =>
  prisma.reading.aggregate({
    where: rangeWhere(userId, range),
    _count: { value: true },
    _max: { value: true },
    _min: { value: true },
    _avg: { value: true },
  });

/**
 * Daily, month-to-date and previous-month reports for the selected date.
 * The daily report also lists its readings; month-to-date includes the readings
 * so the client can draw the monthly chart without another request.
 */
async function getReports(userId, date) {
  const ranges = getReportRanges(date);

  // REPEATABLE READ so all five queries see the same snapshot (with Postgres's default
  // READ COMMITTED each statement could see a write the previous one missed).
  const [dailyAgg, monthAgg, prevAgg, dailyRows, monthRows] = await prisma.$transaction(
    [
    aggregateRange(userId, ranges.daily),
    aggregateRange(userId, ranges.monthToDate),
    aggregateRange(userId, ranges.previousMonth),
    prisma.reading.findMany({ where: rangeWhere(userId, ranges.daily), orderBy: { slot: 'asc' } }),
    prisma.reading.findMany({
      where: rangeWhere(userId, ranges.monthToDate),
      orderBy: [{ date: 'asc' }, { slot: 'asc' }],
    }),
    ],
    { isolationLevel: 'RepeatableRead' }
  );

  const daily = { range: ranges.daily, ...toSummary(dailyAgg) };
  const monthToDate = { range: ranges.monthToDate, ...toSummary(monthAgg) };
  const previousMonth = { range: ranges.previousMonth, ...toSummary(prevAgg) };

  return {
    date,
    daily: { ...daily, readings: dailyRows.map(serialize) },
    monthToDate: { ...monthToDate, readings: monthRows.map(serialize) },
    previousMonth,
  };
}

module.exports = { getReports };
