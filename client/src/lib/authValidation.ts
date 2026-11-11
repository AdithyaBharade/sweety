/**
 * Client-side checks for the sign-up and login forms. They mirror the API rules
 * (server/src/utils/validation.js) so users get instant feedback; the API stays the
 * source of truth and its messages are still shown if something slips through.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72; // bcrypt ignores anything after 72 bytes
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthFormValues {
  name: string;
  email: string;
  password: string;
}

export type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>;

const byteLength = (s: string) => new TextEncoder().encode(s).length;

export function validateAuthForm(values: AuthFormValues, mode: 'login' | 'register'): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();

  if (mode === 'register') {
    if (!name) errors.name = 'Please enter your name.';
    else if (name.length > MAX_NAME_LENGTH) errors.name = 'Name is too long.';
  }

  if (!email) errors.email = 'Please enter your email.';
  else if (mode === 'register' && (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email))) {
    errors.email = 'Please enter a valid email.';
  }

  if (!values.password) {
    errors.password = mode === 'register' ? 'Please enter a password.' : 'Please enter your password.';
  } else if (mode === 'register') {
    if (values.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    } else if (byteLength(values.password) > MAX_PASSWORD_BYTES) {
      errors.password = `Password must be at most ${MAX_PASSWORD_BYTES} characters.`;
    }
  }

  return errors;
}
