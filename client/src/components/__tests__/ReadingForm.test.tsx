import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ReadingForm from '../ReadingForm';
import type { Reading } from '@/lib/types';

const TODAY = '2026-10-15';

function setup(onSubmit = vi.fn().mockResolvedValue(undefined), editing: Reading | null = null) {
  const user = userEvent.setup();
  render(<ReadingForm onSubmit={onSubmit} today={TODAY} editing={editing} />);
  return {
    user,
    onSubmit,
    date: screen.getByLabelText('Date'),
    slot: screen.getByLabelText('Time slot'),
    value: screen.getByLabelText('Glucose (mg/dl)'),
    submit: screen.getByRole('button', { name: /add reading|save changes/i }),
  };
}

describe('ReadingForm', () => {
  it('shows an error and does not submit when the value is missing', async () => {
    const { user, slot, submit, onSubmit } = setup();
    await user.selectOptions(slot, 'AFTER_LUNCH');
    await user.click(submit);

    expect(await screen.findByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects values outside 40-600', async () => {
    const { user, slot, value, submit, onSubmit } = setup();
    await user.selectOptions(slot, 'AFTER_LUNCH');
    await user.type(value, '601');
    await user.click(submit);

    expect(await screen.findByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a future date', async () => {
    const { user, date, slot, value, submit } = setup();
    await user.clear(date);
    await user.type(date, '2026-10-16');
    await user.selectOptions(slot, 'MORNING_FASTING');
    await user.type(value, '100');
    await user.click(submit);

    expect(await screen.findByText('Date cannot be in the future.')).toBeInTheDocument();
  });

  it('submits a valid reading as numbers', async () => {
    const { user, slot, value, submit, onSubmit } = setup();
    await user.selectOptions(slot, 'AFTER_DINNER');
    await user.type(value, '145');
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({ date: TODAY, slot: 'AFTER_DINNER', value: 145 });
  });

  it('shows the API error message (e.g. duplicate slot) next to the field', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      error: 'You already have an After lunch reading for this date.',
      field: 'slot',
    });
    const { user, slot, value, submit } = setup(onSubmit);
    await user.selectOptions(slot, 'AFTER_LUNCH');
    await user.type(value, '150');
    await user.click(submit);

    expect(
      await screen.findByText('You already have an After lunch reading for this date.')
    ).toBeInTheDocument();
  });

  it('pre-fills the form when editing', () => {
    const reading: Reading = {
      id: 1,
      date: '2026-10-10',
      slot: 'AFTER_BREAKFAST',
      slotLabel: 'After breakfast',
      value: 170,
      createdAt: '',
      updatedAt: '',
    };
    const { date, slot, value } = setup(undefined, reading);

    expect(screen.getByRole('heading', { name: 'Edit reading' })).toBeInTheDocument();
    expect(date).toHaveValue('2026-10-10');
    expect(slot).toHaveValue('AFTER_BREAKFAST');
    expect(value).toHaveValue(170);
  });

  it('links the error to its field and moves focus there (screen-reader friendly)', async () => {
    const { user, slot, value, submit } = setup();
    await user.type(value, '120');
    await user.click(submit);

    const message = await screen.findByRole('alert');
    expect(message).toHaveTextContent('Please choose a time slot.');
    expect(slot).toHaveAttribute('aria-invalid', 'true');
    expect(slot).toHaveAccessibleDescription('Please choose a time slot.');
    expect(slot).toHaveFocus();
  });

  it('focuses the field named in an API error', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      error: 'You already have an After lunch reading for this date.',
      field: 'slot',
    });
    const { user, slot, value, submit } = setup(onSubmit);
    await user.selectOptions(slot, 'AFTER_LUNCH');
    await user.type(value, '150');
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent('You already have an After lunch reading for this date.');
    expect(slot).toHaveFocus();
  });
});
