'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import RequireAuth from '@/components/RequireAuth';
import ReadingForm from '@/components/ReadingForm';
import ReadingsGrid from '@/components/ReadingsGrid';
import { getApiError, readingsApi } from '@/lib/api';
import { SLOT_OPTIONS } from '@/lib/constants';
import { formatDate, todayString } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { Paginated, Reading, ReadingInput } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PAGE_SIZE = 10;

/** Shows which of today's 4 slots are already filled. */
function TodayStrip({ readings }: { readings: Reading[] }) {
  const bySlot = new Map(readings.map((r) => [r.slot, r]));
  return (
    <Card size="sm" className="mb-6">
      <CardHeader>
        <CardTitle>Today</CardTitle>
        <CardDescription>{formatDate(todayString())}</CardDescription>
        <CardAction>
          <Badge variant={readings.length === 4 ? 'default' : 'secondary'}>{readings.length} / 4 logged</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SLOT_OPTIONS.map((s) => {
          const r = bySlot.get(s.value);
          return (
            <div
              key={s.value}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                r ? 'border-primary/30 bg-primary/5' : 'border-dashed text-muted-foreground'
              )}
            >
              {r ? <CheckCircle2 className="size-4 shrink-0 text-primary" /> : <Circle className="size-4 shrink-0" />}
              <span className="truncate">{s.label}</span>
              {r && <span className="ml-auto font-semibold tabular-nums">{r.value}</span>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const today = todayString();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<Reading> | null>(null);
  const [todayReadings, setTodayReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [editing, setEditing] = useState<Reading | null>(null);
  const [toDelete, setToDelete] = useState<Reading | null>(null);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setListError('');
      try {
        const [res, todayRes] = await Promise.all([
          readingsApi.list({ page: p, limit: PAGE_SIZE }),
          readingsApi.list({ from: today, to: today, limit: 4 }),
        ]);
        setTodayReadings(todayRes.data);
        // If we deleted the last row on the last page, step back a page.
        if (res.data.length === 0 && p > 1) return setPage(p - 1);
        setResult(res);
      } catch (err) {
        setListError(getApiError(err).error);
      } finally {
        setLoading(false);
      }
    },
    [today]
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  async function handleSubmit(input: ReadingInput) {
    try {
      if (editing) {
        await readingsApi.update(editing.id, input);
        setEditing(null);
        toast.success('Reading updated');
      } else {
        await readingsApi.create(input);
        toast.success('Reading added');
      }
      await load(page);
    } catch (err) {
      throw getApiError(err); // the form shows this message
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await readingsApi.remove(toDelete.id);
      setEditing((e) => (e?.id === toDelete.id ? null : e));
      toast.success('Reading deleted');
      await load(page);
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setToDelete(null);
    }
  }

  const handleEdit = useCallback((r: Reading) => {
    setEditing(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const handleDelete = useCallback((r: Reading) => setToDelete(r), []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">My readings</h1>
        <p className="text-sm text-muted-foreground">
          Up to 4 readings a day: fasting, after breakfast, after lunch and after dinner.
        </p>
      </div>

      <TodayStrip readings={todayReadings} />

      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        <div className="lg:sticky lg:top-20">
          <ReadingForm editing={editing} onSubmit={handleSubmit} onCancelEdit={() => setEditing(null)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>All your readings, newest first.</CardDescription>
            {result && (
              <CardAction>
                <Badge variant="outline">{result.total} total</Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {listError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{listError}</AlertDescription>
              </Alert>
            )}

            <ReadingsGrid rows={result?.data ?? []} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />

            {result && result.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {result.page} of {result.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
                    <ChevronLeft /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= result.totalPages || loading}
                    onClick={() => setPage(page + 1)}
                  >
                    Next <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reading?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete &&
                `${toDelete.slotLabel} on ${formatDate(toDelete.date)} (${toDelete.value} mg/dl) will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
