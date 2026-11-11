'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus } from 'lucide-react';
import { SLOT_OPTIONS } from '@/lib/constants';
import { todayString } from '@/lib/dates';
import { validateReading, type FieldErrors, type ReadingFormValues } from '@/lib/validation';
import type { ApiErrorBody, Reading, ReadingInput, Slot } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

interface Props {
  /** When set, the form edits this reading instead of creating a new one. */
  editing?: Reading | null;
  /** Saves the reading. Should throw an ApiErrorBody-like error on failure. */
  onSubmit: (input: ReadingInput) => Promise<void>;
  onCancelEdit?: () => void;
  /** Injectable for tests. */
  today?: string;
}

const emptyValues = (today: string): ReadingFormValues => ({ date: today, slot: '', value: '' });

const FIELDS = ['date', 'slot', 'value'] as const;
const inputId = (field: keyof ReadingFormValues) => `reading-${field}`;
const errorId = (field: keyof ReadingFormValues) => `reading-${field}-error`;

/** Error text linked to its input via aria-describedby, and announced by screen readers. */
function FieldError({ field, message }: { field: keyof ReadingFormValues; message?: string }) {
  return message ? (
    <p id={errorId(field)} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

/** Moves keyboard focus to the first field that has an error. */
function focusFirstError(errors: FieldErrors) {
  const first = FIELDS.find((f) => errors[f]);
  if (first) document.getElementById(inputId(first))?.focus();
}

export default function ReadingForm({ editing, onSubmit, onCancelEdit, today = todayString() }: Props) {
  const [values, setValues] = useState<ReadingFormValues>(emptyValues(today));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the reading into the form when the user clicks "Edit".
  useEffect(() => {
    setErrors({});
    setFormError('');
    setValues(
      editing
        ? { date: editing.date, slot: editing.slot, value: String(editing.value) }
        : emptyValues(today)
    );
  }, [editing, today]);

  const update =
    (field: keyof ReadingFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      setErrors((errs) => ({ ...errs, [field]: undefined }));
      setFormError('');
    };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateReading(values, today);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(found);

    setSaving(true);
    try {
      await onSubmit({ date: values.date, slot: values.slot as Slot, value: Number(values.value) });
      if (!editing) setValues((v) => ({ ...emptyValues(today), date: v.date }));
    } catch (err) {
      // Show API errors next to the related field when we know it.
      const { error, field } = err as ApiErrorBody;
      if (field && field in values) {
        const apiErrors = { [field]: error };
        setErrors(apiErrors);
        focusFirstError(apiErrors);
      } else setFormError(error || 'Could not save the reading.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={editing ? 'ring-2 ring-primary/40' : undefined}>
      <CardHeader>
        <h2 className="flex items-center gap-2 font-heading text-base font-medium">
          {editing ? <Pencil className="size-4 text-primary" /> : <Plus className="size-4 text-primary" />}
          {editing ? 'Edit reading' : 'Add a reading'}
        </h2>
        <CardDescription>Whole numbers from 40 to 600 mg/dl.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate aria-label="Reading form">
        <CardContent className="space-y-4">
          {formError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reading-date">Date</Label>
            <Input
              id={inputId('date')}
              type="date"
              value={values.date}
              max={today}
              onChange={update('date')}
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? errorId('date') : undefined}
            />
            <FieldError field="date" message={errors.date} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading-slot">Time slot</Label>
            <NativeSelect
              id={inputId('slot')}
              className="w-full"
              value={values.slot}
              onChange={update('slot')}
              aria-invalid={!!errors.slot}
              aria-describedby={errors.slot ? errorId('slot') : undefined}
            >
              <NativeSelectOption value="">Select a slot…</NativeSelectOption>
              {SLOT_OPTIONS.map((s) => (
                <NativeSelectOption key={s.value} value={s.value}>
                  {s.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError field="slot" message={errors.slot} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading-value">Glucose (mg/dl)</Label>
            <div className="relative">
              <Input
                id={inputId('value')}
                type="number"
                inputMode="numeric"
                placeholder="e.g. 110"
                className="pr-16"
                value={values.value}
                onChange={update('value')}
                aria-invalid={!!errors.value}
                aria-describedby={errors.value ? errorId('value') : 'reading-value-hint'}
              />
              <span
                id="reading-value-hint"
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground"
              >
                mg/dl
              </span>
            </div>
            <FieldError field="value" message={errors.value} />
          </div>
        </CardContent>

        <CardFooter className="mt-6 flex gap-2">
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {editing ? 'Save changes' : 'Add reading'}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Cancel
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
