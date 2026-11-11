const { roundTo1, toSummary } = require('../../src/utils/stats');

const agg = (count, max, min, avg) => ({
  _count: { value: count },
  _max: { value: max },
  _min: { value: min },
  _avg: { value: avg },
});

describe('roundTo1', () => {
  it.each([
    [123.456, 123.5],
    [100, 100],
    [99.94, 99.9],
    [133.3333, 133.3],
  ])('%p -> %p', (input, expected) => {
    expect(roundTo1(input)).toBe(expected);
  });
});

describe('toSummary', () => {
  it('returns highest, lowest, average (1 decimal) and count', () => {
    // values 100, 120, 180 -> avg 133.333...
    expect(toSummary(agg(3, 180, 100, 133.3333333))).toEqual({
      count: 3,
      highest: 180,
      lowest: 100,
      average: 133.3,
    });
  });

  it('returns nulls when there are no readings', () => {
    expect(toSummary(agg(0, null, null, null))).toEqual({
      count: 0,
      highest: null,
      lowest: null,
      average: null,
    });
  });
});
