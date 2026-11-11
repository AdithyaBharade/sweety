const {
  validateReadingInput,
  validateRegisterInput,
  validateLoginInput,
} = require('../../src/utils/validation');

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

  it.each([120.5, '120.5'])('rejects decimals (%p)', (value) => {
    expect(errorFor({ ...valid, value })).toBe('Value must be a whole number.');
  });

  it('trims whitespace around a numeric string', () => {
    expect(validateReadingInput({ ...valid, value: ' 140 ' }, TODAY).value).toBe(140);
  });

  it.each(['abc', '12abc', true, '0x64', '1e2', 'Infinity', '12 0'])('rejects non-numbers (%p)', (value) => {
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
      validateRegisterInput({ name: '  Asha ', email: 'Asha@Example.COM ', password: 'secret12' })
    ).toEqual({ name: 'Asha', email: 'asha@example.com', password: 'secret12' });
  });

  it('rejects short passwords', () => {
    expect(() => validateRegisterInput({ name: 'A', email: 'a@b.co', password: '1234567' })).toThrow(
      'Password must be at least 8 characters.'
    );
  });

  it('rejects passwords longer than bcrypt can use (72 bytes)', () => {
    expect(() => validateRegisterInput({ name: 'A', email: 'a@b.co', password: 'x'.repeat(73) })).toThrow(
      'Password must be at most 72 characters.'
    );
    // Multi-byte characters count by bytes: 25 x 3-byte chars = 75 bytes.
    expect(() => validateRegisterInput({ name: 'A', email: 'a@b.co', password: '€'.repeat(25) })).toThrow(
      'at most 72'
    );
  });

  it('rejects over-long emails and non-string fields', () => {
    const long = `${'a'.repeat(250)}@b.co`;
    expect(() => validateRegisterInput({ name: 'A', email: long, password: 'secret12' })).toThrow(
      'Please enter a valid email.'
    );
    expect(() => validateRegisterInput({ name: { x: 1 }, email: 'a@b.co', password: 'secret12' })).toThrow(
      'Please enter a valid name.'
    );
  });
});

describe('validateLoginInput', () => {
  it('treats over-long input as a failed login (401)', () => {
    try {
      validateLoginInput({ email: 'a@b.co', password: 'x'.repeat(200) });
    } catch (err) {
      expect(err.status).toBe(401);
      expect(err.message).toBe('Invalid email or password.');
    }
    expect.assertions(2);
  });
});
