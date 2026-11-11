const {
  isValidDateString,
  todayInTimeZone,
  isValidTimeZone,
  todayForRequest,
  getReportRanges,
} = require('../../src/utils/dates');

describe('getReportRanges', () => {
  it('matches the example from the spec (selected date 15 Oct 2026)', () => {
    expect(getReportRanges('2026-10-15')).toEqual({
      daily: { from: '2026-10-15', to: '2026-10-15' },
      monthToDate: { from: '2026-10-01', to: '2026-10-15' },
      previousMonth: { from: '2026-09-01', to: '2026-09-30' },
    });
  });

  it('rolls the previous month back into last year in January', () => {
    expect(getReportRanges('2027-01-10').previousMonth).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });

  it('handles February in a leap year', () => {
    expect(getReportRanges('2028-03-05').previousMonth).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });
});

describe('isValidDateString', () => {
  it.each(['2026-10-15', '2028-02-29'])('accepts %s', (d) => {
    expect(isValidDateString(d)).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '15-10-2026', '2026-1-5', '', null, 20261015])(
    'rejects %p',
    (d) => {
      expect(isValidDateString(d)).toBe(false);
    }
  );
});

describe('todayInTimeZone', () => {
  it('uses the given time zone, not UTC', () => {
    // 20:00 UTC on 14 Oct is already 15 Oct in India (UTC+5:30)
    const now = new Date('2026-10-14T20:00:00Z');
    expect(todayInTimeZone('UTC', now)).toBe('2026-10-14');
    expect(todayInTimeZone('Asia/Kolkata', now)).toBe('2026-10-15');
  });
});

describe('todayForRequest', () => {
  // 20:00 UTC on 10 Nov = 01:30 on 11 Nov in India, 07:00 on 11 Nov in Sydney, 12:00 on 10 Nov in LA.
  const now = new Date('2026-11-10T20:00:00Z');
  const req = (tz) => ({ get: (h) => (h.toLowerCase() === 'x-timezone' ? tz : undefined) });

  it("uses the user's time zone from the X-Timezone header", () => {
    expect(todayForRequest(req('Australia/Sydney'), 'Asia/Kolkata', now)).toBe('2026-11-11');
    expect(todayForRequest(req('America/Los_Angeles'), 'Asia/Kolkata', now)).toBe('2026-11-10');
  });

  it.each([undefined, '', 'Not/AZone', 'x'.repeat(100)])('falls back to the app zone for %p', (tz) => {
    expect(todayForRequest(req(tz), 'Asia/Kolkata', now)).toBe('2026-11-11');
    expect(todayForRequest(req(tz), 'America/Los_Angeles', now)).toBe('2026-11-10');
  });

  it('validates IANA zones', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
  });
});
