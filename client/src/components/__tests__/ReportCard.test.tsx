import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReportCard from '../ReportCard';
import { toChartRows } from '../MonthChart';
import type { Reading } from '@/lib/types';

const range = { from: '2026-10-01', to: '2026-10-15' };

describe('ReportCard', () => {
  it('shows highest, lowest, average (1 decimal) and count', () => {
    render(
      <ReportCard title="Month to date" report={{ range, count: 3, highest: 210, lowest: 92, average: 140 }} />
    );
    const card = screen.getByLabelText('Month to date');
    expect(within(card).getByText('1 Oct – 15 Oct 2026')).toBeInTheDocument();
    expect(within(card).getByText('140.0')).toBeInTheDocument(); // always 1 decimal
    expect(within(card).getByText('210')).toBeInTheDocument();
    expect(within(card).getByText('92')).toBeInTheDocument();
    expect(within(card).getByText('3 readings')).toBeInTheDocument();
  });

  it('shows a friendly empty state when there are no readings', () => {
    render(
      <ReportCard title="Daily" report={{ range, count: 0, highest: null, lowest: null, average: null }} />
    );
    expect(screen.getByText('No readings yet')).toBeInTheDocument();
    expect(screen.queryByText('Average')).not.toBeInTheDocument();
  });
});

describe('toChartRows', () => {
  const reading = (date: string, slot: Reading['slot'], value: number): Reading => ({
    id: Math.random(),
    date,
    slot,
    value,
    slotLabel: slot,
    createdAt: '',
    updatedAt: '',
  });

  it('groups readings into one row per day, sorted by date, with a column per slot', () => {
    const rows = toChartRows([
      reading('2026-10-03', 'AFTER_LUNCH', 180),
      reading('2026-10-01', 'MORNING_FASTING', 95),
      reading('2026-10-03', 'MORNING_FASTING', 101),
    ]);
    expect(rows).toEqual([
      { date: '2026-10-01', day: 1, MORNING_FASTING: 95 },
      { date: '2026-10-03', day: 3, MORNING_FASTING: 101, AFTER_LUNCH: 180 },
    ]);
  });
});
