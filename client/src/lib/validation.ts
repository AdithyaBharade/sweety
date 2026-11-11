import { MAX_VALUE, MIN_VALUE } from './constants';

export interface ReadingFormValues {
  date: string;
  slot: string;
  value: string; // raw text from the input
}

export type FieldErrors = Partial<Record<keyof ReadingFormValues, string>>;

/**
 * Client-side checks that mirror the API, so the user gets instant feedback.
 * Rules that need existing data (one per slot, max 4 per day) are checked by the API
 * and its message is shown in the form.
 */
export function validateReading(values: ReadingFormValues, today: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.date) errors.date = 'Please choose a date.';
  else if (values.date > today) errors.date = 'Date cannot be in the future.';

  if (!values.slot) errors.slot = 'Please choose a time slot.';

  const raw = values.value.trim();
  if (raw === '') {
    errors.value = 'Please enter a glucose value.';
  } else {
    const num = Number(raw);
    if (!Number.isFinite(num)) errors.value = 'Value must be a number.';
    else if (!Number.isInteger(num)) errors.value = 'Value must be a whole number.';
    else if (num < MIN_VALUE || num > MAX_VALUE) {
      errors.value = `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`;
    }
  }

  return errors;
}
