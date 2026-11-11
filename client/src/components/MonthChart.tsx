'use client';

import { useMemo } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { SLOT_OPTIONS } from '@/lib/constants';
import { formatDate } from '@/lib/dates';
import type { Reading, Slot } from '@/lib/types';

// Validated categorical palette (colour-blind safe), in fixed slot order. Defined in globals.css.
const SLOT_COLORS: Record<Slot, string> = {
  MORNING_FASTING: 'var(--chart-1)',
  AFTER_BREAKFAST: 'var(--chart-2)',
  AFTER_LUNCH: 'var(--chart-3)',
  AFTER_DINNER: 'var(--chart-4)',
};

type Row = { date: string; day: number } & Partial<Record<Slot, number>>;

/** Turns a flat list of readings into one row per day with a column per slot. */
export function toChartRows(readings: Reading[]): Row[] {
  const byDate = new Map<string, Row>();
  for (const r of readings) {
    const row = byDate.get(r.date) ?? { date: r.date, day: Number(r.date.slice(8, 10)) };
    row[r.slot] = r.value;
    byDate.set(r.date, row);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium">{formatDate(row.date)}</p>
      {payload.map((p) => (
        <div key={p.dataKey as string} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function MonthChart({ readings }: { readings: Reading[] }) {
  const rows = useMemo(() => toChartRows(readings), [readings]);
  // Y ticks: the 40 floor, the target band edges (70, 180) and a rounded top.
  const top = Math.max(250, Math.ceil(Math.max(...readings.map((r) => r.value), 0) / 50) * 50);

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <LineChartIcon className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No readings this month to chart yet.</p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          {/* Shaded band for the typical target range */}
          <ReferenceArea y1={70} y2={180} fill="var(--chart-3)" fillOpacity={0.07} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            domain={[40, top]}
            ticks={[40, 70, 180, top]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
          />
          {SLOT_OPTIONS.map((s) => (
            <Line
              key={s.value}
              type="monotone"
              dataKey={s.value}
              name={s.label}
              stroke={SLOT_COLORS[s.value]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: SLOT_COLORS[s.value] }}
              activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
