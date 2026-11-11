const { SLOTS } = require('./slots');
const { isValidDateString } = require('./dates');
const { badRequest, unauthorized } = require('./errors');

const MIN_VALUE = 40;
const MAX_VALUE = 600;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt only uses the first 72 bytes; longer passwords would be silently truncated.
const MAX_PASSWORD_BYTES = 72;
// Plain decimal numbers only: no hex ("0x64"), exponents ("1e2") or other JS Number() tricks.
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * Validates the body of a create/update reading request.
 * These checks do not need the database; the "one per slot" and "max 4 per day"
 * rules are checked in the service because they depend on existing readings.
 *
 * @param {object} body  raw request body
 * @param {string} today 'YYYY-MM-DD' in the app time zone
 * @returns {{date: string, slot: string, value: number}}
 * @throws {AppError} 400 with the first problem found
 */
function validateReadingInput(body, today) {
  const { date, slot, value } = body || {};

  if (isBlank(date)) throw badRequest('Please choose a date.', 'date');
  if (!isValidDateString(date)) throw badRequest('Date must be a valid date (YYYY-MM-DD).', 'date');
  // Both are YYYY-MM-DD so a string comparison is a date comparison.
  if (date > today) throw badRequest('Date cannot be in the future.', 'date');

  if (isBlank(slot)) throw badRequest('Please choose a time slot.', 'slot');
  if (!SLOTS.includes(slot)) throw badRequest('Please choose a valid time slot.', 'slot');

  if (isBlank(value)) throw badRequest('Please enter a glucose value.', 'value');
  // Accept 120 or "120", but not "12abc", "0x64", "1e2" or true.
  let num = value;
  if (typeof value === 'string') {
    const raw = value.trim();
    num = NUMBER_RE.test(raw) ? Number(raw) : NaN;
  }
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    throw badRequest('Value must be a number.', 'value');
  }
  if (!Number.isInteger(num)) throw badRequest('Value must be a whole number.', 'value');
  if (num < MIN_VALUE || num > MAX_VALUE) {
    throw badRequest(`Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`, 'value');
  }

  return { date, slot, value: num };
}

function validateRegisterInput(body) {
  const { name, email, password } = body || {};
  if (isBlank(name)) throw badRequest('Please enter your name.', 'name');
  if (typeof name !== 'string') throw badRequest('Please enter a valid name.', 'name');
  if (String(name).trim().length > 100) throw badRequest('Name is too long.', 'name');
  if (isBlank(email)) throw badRequest('Please enter your email.', 'email');
  if (typeof email !== 'string' || email.trim().length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email.trim())) {
    throw badRequest('Please enter a valid email.', 'email');
  }
  if (isBlank(password)) throw badRequest('Please enter a password.', 'password');
  if (typeof password !== 'string') throw badRequest('Please enter a valid password.', 'password');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 'password');
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw badRequest(`Password must be at most ${MAX_PASSWORD_BYTES} characters.`, 'password');
  }
  return {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    password: String(password),
  };
}

function validateLoginInput(body) {
  const { email, password } = body || {};
  if (isBlank(email)) throw badRequest('Please enter your email.', 'email');
  if (isBlank(password)) throw badRequest('Please enter your password.', 'password');
  // Over-long input can never match a stored account, so treat it as a failed login.
  if (String(email).length > MAX_EMAIL_LENGTH || Buffer.byteLength(String(password), 'utf8') > MAX_PASSWORD_BYTES) {
    throw unauthorized('Invalid email or password.');
  }
  return { email: String(email).trim().toLowerCase(), password: String(password) };
}

module.exports = {
  MIN_VALUE,
  MAX_VALUE,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_BYTES,
  validateReadingInput,
  validateRegisterInput,
  validateLoginInput,
};
