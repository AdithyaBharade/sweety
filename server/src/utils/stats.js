/** Round to 1 decimal place, e.g. 123.456 -> 123.5 */
function roundTo1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Turns a Prisma `aggregate` result into the report summary shape.
 * Returns nulls (not 0) when there is no data so the UI can show an empty state.
 *
 * @param {{_count: {value: number}, _max: {value: number|null}, _min: {value: number|null}, _avg: {value: number|null}}} agg
 */
function toSummary(agg) {
  const count = agg._count.value;
  if (!count) return { count: 0, highest: null, lowest: null, average: null };
  return {
    count,
    highest: agg._max.value,
    lowest: agg._min.value,
    average: roundTo1(agg._avg.value),
  };
}

module.exports = { roundTo1, toSummary };
