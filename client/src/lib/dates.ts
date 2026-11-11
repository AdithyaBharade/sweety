const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date in the browser's time zone as YYYY-MM-DD (what <input type="date"> uses). */
export function todayString(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** '2026-10-15' -> '15 Oct 2026' */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Formats a range, e.g. '1 Oct – 15 Oct 2026' or just '15 Oct 2026' for a single day. */
export function formatRange(from: string, to: string): string {
  if (from === to) return formatDate(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const start = sameYear ? formatDate(from).replace(/ \d{4}$/, '') : formatDate(from);
  return `${start} – ${formatDate(to)}`;
}
