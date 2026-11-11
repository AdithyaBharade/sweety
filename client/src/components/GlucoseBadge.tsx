import { ArrowDown, ArrowUp, Check } from 'lucide-react';
import { glucoseLevel } from '@/lib/constants';
import { cn } from '@/lib/utils';

const STYLES = {
  low: { className: 'bg-red-50 text-red-700 ring-red-200', icon: ArrowDown, label: 'Low' },
  normal: { className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: Check, label: 'In range' },
  high: { className: 'bg-amber-50 text-amber-800 ring-amber-200', icon: ArrowUp, label: 'High' },
} as const;

/** A value with an icon + text label, so the level is never shown by colour alone. */
export default function GlucoseBadge({ value }: { value: number }) {
  const { className, icon: Icon, label } = STYLES[glucoseLevel(value)];
  return (
    <span className="cell-center">
      <span className="w-10 text-right font-medium tabular-nums">{value}</span>
      <span
        className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', className)}
        title={`${label} (target 70–180 mg/dl)`}
      >
        <Icon className="size-3" />
        {label}
      </span>
    </span>
  );
}
