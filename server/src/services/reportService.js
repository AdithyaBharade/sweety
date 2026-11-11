const prisma = require('../lib/prisma');
const { getReportRanges, toDbDate } = require('../utils/dates');
const { toSummary } = require('../utils/stats');
const { serialize } = require('./readingService');

const rangeWhere = (userId, { from, to }) => ({
  userId,
  date: { gte: toDbDate(from), lte: toDbDate(to) },
});

async function summarizeRange(userId, range) {
  const agg = await prisma.reading.aggregate({
    where: rangeWhere(userId, range),
    _count: { value: true },
    _max: { value: true },
    _min: { value: true },
    _avg: { value: true },
  });
  return { range, ...toSummary(agg) };
}

/**
 * Daily, month-to-date and previous-month reports for the selected date.
 * The daily report also lists its readings; month-to-date includes the readings
 * so the client can draw the monthly chart without another request.
 */
async function getReports(userId, date) {
  const ranges = getReportRanges(date);

  const [daily, monthToDate, previousMonth, dailyRows, monthRows] = await Promise.all([
    summarizeRange(userId, ranges.daily),
    summarizeRange(userId, ranges.monthToDate),
    summarizeRange(userId, ranges.previousMonth),
    prisma.reading.findMany({ where: rangeWhere(userId, ranges.daily), orderBy: { slot: 'asc' } }),
    prisma.reading.findMany({
      where: rangeWhere(userId, ranges.monthToDate),
      orderBy: [{ date: 'asc' }, { slot: 'asc' }],
    }),
  ]);

  return {
    date,
    daily: { ...daily, readings: dailyRows.map(serialize) },
    monthToDate: { ...monthToDate, readings: monthRows.map(serialize) },
    previousMonth,
  };
}

module.exports = { getReports };
