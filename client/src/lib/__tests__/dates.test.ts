import { describe, expect, it } from 'vitest';
import { formatDate, formatRange, todayString } from '../dates';

describe('date helpers', () => {
  // The examples from the assignment brief (selected date 15 Oct 2026).
  it.each([
    ['2026-10-15', '2026-10-15', '15 Oct 2026'],
    ['2026-10-01', '2026-10-15', '1 Oct – 15 Oct 2026'],
    ['2026-09-01', '2026-09-30', '1 Sep – 30 Sep 2026'],
  ])('formats %s → %s as "%s"', (from, to, expected) => {
    expect(formatRange(from, to)).toBe(expected);
  });

  it('keeps both years when a range crosses New Year', () => {
    expect(formatRange('2025-12-01', '2026-01-05')).toBe('1 Dec 2025 – 5 Jan 2026');
  });

  it('formats a date without shifting it a day (no time-zone drift)', () => {
    expect(formatDate('2026-03-01')).toBe('1 Mar 2026');
  });

  it("uses the browser's local date for today, not UTC", () => {
    // 23:30 local time on 31 Dec must still be 31 Dec.
    expect(todayString(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
  });
});
