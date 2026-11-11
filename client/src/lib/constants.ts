import type { Slot } from './types';

export const SLOT_OPTIONS: { value: Slot; label: string }[] = [
  { value: 'MORNING_FASTING', label: 'Morning (fasting)' },
  { value: 'AFTER_BREAKFAST', label: 'After breakfast' },
  { value: 'AFTER_LUNCH', label: 'After lunch' },
  { value: 'AFTER_DINNER', label: 'After dinner' },
];

export const SLOT_LABELS: Record<Slot, string> = Object.fromEntries(
  SLOT_OPTIONS.map((s) => [s.value, s.label])
) as Record<Slot, string>;

export const MIN_VALUE = 40;
export const MAX_VALUE = 600;

/** Rough colour bands for display only - not medical advice. */
export function glucoseLevel(value: number): 'low' | 'normal' | 'high' {
  if (value < 70) return 'low';
  if (value > 180) return 'high';
  return 'normal';
}
