import { Activity, ArrowDown, ArrowUp, Hash, Inbox } from 'lucide-react';
import { formatRange } from '@/lib/dates';
import type { ReportSummary } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  title: string;
  report: ReportSummary;
}

export default function ReportCard({ title, report }: Props) {
  const { range, count, highest, lowest, average } = report;

  const stats = [
    { label: 'Average', value: average?.toFixed(1), icon: Activity, unit: 'mg/dl' },
    { label: 'Highest', value: highest, icon: ArrowUp, unit: 'mg/dl' },
    { label: 'Lowest', value: lowest, icon: ArrowDown, unit: 'mg/dl' },
    { label: 'Readings', value: count, icon: Hash },
  ];

  return (
    <Card aria-label={title}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{formatRange(range.from, range.to)}</CardDescription>
        {count > 0 && (
          <CardAction>
            <Badge variant="secondary">{count} {count === 1 ? 'reading' : 'readings'}</Badge>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        {count === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
            <Inbox className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No readings yet</p>
            <p className="text-xs text-muted-foreground">Nothing recorded for this period.</p>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-3">
            {stats.map(({ label, value, icon: Icon, unit }) => (
              <div key={label} className="rounded-lg bg-muted/60 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="size-3.5" />
                  {label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {value}
                  {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
