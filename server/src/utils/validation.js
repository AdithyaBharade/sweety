const { SLOTS } = require('./slots');
const { isValidDateString } = require('./dates');
const { badRequest } = require('./errors');

const MIN_VALUE = 40;
const MAX_VALUE = 600;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  // Accept 120 or "120", but not "12abc", 120.5 or true.
  const num = typeof value === 'string' ? Number(value.trim()) : value;
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
  if (String(name).trim().length > 100) throw badRequest('Name is too long.', 'name');
  if (isBlank(email)) throw badRequest('Please enter your email.', 'email');
  if (!EMAIL_RE.test(String(email).trim())) throw badRequest('Please enter a valid email.', 'email');
  if (isBlank(password)) throw badRequest('Please enter a password.', 'password');
  if (String(password).length < 6) {
    throw badRequest('Password must be at least 6 characters.', 'password');
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
  return { email: String(email).trim().toLowerCase(), password: String(password) };
}

module.exports = {
  MIN_VALUE,
  MAX_VALUE,
  validateReadingInput,
  validateRegisterInput,
  validateLoginInput,
};
