const { validateReadingInput, validateRegisterInput } = require('../../src/utils/validation');

const TODAY = '2026-10-15';
const valid = { date: '2026-10-15', slot: 'AFTER_LUNCH', value: 140 };

/** Runs the validator and returns the error message (or null if it passed). */
function errorFor(body) {
  try {
    validateReadingInput(body, TODAY);
    return null;
  } catch (err) {
    return err.message;
  }
}

describe('validateReadingInput', () => {
  it('accepts a valid reading and converts a numeric string to a number', () => {
    expect(validateReadingInput({ ...valid, value: '140' }, TODAY)).toEqual(valid);
  });

  it.each([undefined, null, '', '   '])('requires a value (%p)', (value) => {
    expect(errorFor({ ...valid, value })).toBe('Please enter a glucose value.');
  });

  it.each([39, 601, -5, 0])('rejects out-of-range value %p', (value) => {
    expect(errorFor({ ...valid, value })).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it.each([40, 600])('accepts the boundary value %p', (value) => {
    expect(errorFor({ ...valid, value })).toBeNull();
  });

  it('rejects decimals', () => {
    expect(errorFor({ ...valid, value: 120.5 })).toBe('Value must be a whole number.');
  });

  it.each(['abc', '12abc', true])('rejects non-numbers (%p)', (value) => {
    expect(errorFor({ ...valid, value })).toBe('Value must be a number.');
  });

  it('rejects a future date', () => {
    expect(errorFor({ ...valid, date: '2026-10-16' })).toBe('Date cannot be in the future.');
  });

  it('rejects an impossible date', () => {
    expect(errorFor({ ...valid, date: '2026-02-30' })).toBe('Date must be a valid date (YYYY-MM-DD).');
  });

  it('rejects an unknown slot', () => {
    expect(errorFor({ ...valid, slot: 'MIDNIGHT' })).toBe('Please choose a valid time slot.');
  });

  it('reports which field failed', () => {
    try {
      validateReadingInput({ ...valid, value: 700 }, TODAY);
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.field).toBe('value');
    }
    expect.assertions(2);
  });
});

describe('validateRegisterInput', () => {
  it('normalises email to lower case and trims name', () => {
    expect(
      validateRegisterInput({ name: '  Asha ', email: 'Asha@Example.COM ', password: 'secret1' })
    ).toEqual({ name: 'Asha', email: 'asha@example.com', password: 'secret1' });
  });

  it('rejects short passwords', () => {
    expect(() => validateRegisterInput({ name: 'A', email: 'a@b.co', password: '123' })).toThrow(
      'Password must be at least 6 characters.'
    );
  });
});
