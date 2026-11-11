/**
 * Readings are stored as calendar dates (Postgres DATE), not timestamps.
 * Inside the app we pass dates around as 'YYYY-MM-DD' strings and only convert
 * to a JS Date (UTC midnight) at the Prisma boundary. This avoids time-zone bugs
 * where a reading "moves" to the previous or next day.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n) => String(n).padStart(2, '0');

/** True if `value` is a real calendar date in YYYY-MM-DD format (rejects 2026-02-30). */
function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Today's date as 'YYYY-MM-DD' in the given IANA time zone. */
function todayInTimeZone(timeZone, now = new Date()) {
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 'YYYY-MM-DD' -> Date at UTC midnight (what Prisma expects for @db.Date). */
function toDbDate(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

/** Date from Prisma (@db.Date, UTC midnight) -> 'YYYY-MM-DD'. */
function fromDbDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * The three report ranges for a selected date (all inclusive):
 *  - daily:          the selected date
 *  - monthToDate:    1st of the selected month -> selected date
 *  - previousMonth:  1st -> last day of the month before the selected one
 */
function getReportRanges(dateString) {
  const [y, m] = dateString.split('-').map(Number);

  // Date.UTC handles month underflow, so January correctly rolls back to December.
  const prevStart = new Date(Date.UTC(y, m - 2, 1));
  const prevEnd = new Date(Date.UTC(y, m - 1, 0)); // day 0 = last day of previous month

  return {
    daily: { from: dateString, to: dateString },
    monthToDate: { from: `${y}-${pad(m)}-01`, to: dateString },
    previousMonth: { from: fromDbDate(prevStart), to: fromDbDate(prevEnd) },
  };
}

module.exports = {
  isValidDateString,
  todayInTimeZone,
  toDbDate,
  fromDbDate,
  getReportRanges,
};
