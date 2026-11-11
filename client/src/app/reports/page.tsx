'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Inbox } from 'lucide-react';
import RequireAuth from '@/components/RequireAuth';
import ReportCard from '@/components/ReportCard';
import ReadingsGrid from '@/components/ReadingsGrid';
import MonthChart from '@/components/MonthChart';
import { getApiError, reportsApi } from '@/lib/api';
import { formatDate, formatRange, todayString } from '@/lib/dates';
import type { ReportsResponse } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

function Reports() {
  const today = todayString();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;
    let cancelled = false; // ignore stale responses when the date changes quickly
    setLoading(true);
    setError('');
    reportsApi
      .get(date)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(getApiError(err).error))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Daily, month-to-date and previous-month summaries for the selected date.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-date" className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="size-3.5" /> Selected date
          </Label>
          <Input
            id="report-date"
            type="date"
            className="w-44 bg-background"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data && (
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      )}

      {data && (
        <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
          <div className="grid gap-6 md:grid-cols-3">
            <ReportCard title="Daily" report={data.daily} />
            <ReportCard title="Month to date" report={data.monthToDate} />
            <ReportCard title="Previous month" report={data.previousMonth} />
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[2fr_3fr]">
            <Card>
              <CardHeader>
                <CardTitle>Readings on {formatDate(data.date)}</CardTitle>
                <CardDescription>Each reading with its time slot.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.daily.readings.length ? (
                  <ReadingsGrid rows={data.daily.readings} showDate={false} />
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
                    <Inbox className="size-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No readings on this day.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>This month</CardTitle>
                <CardDescription>
                  {formatRange(data.monthToDate.range.from, data.monthToDate.range.to)} · shaded band = target 70–180 mg/dl
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MonthChart readings={data.monthToDate.readings} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ReportsPage() {
  return (
    <RequireAuth>
      <Reports />
    </RequireAuth>
  );
}
