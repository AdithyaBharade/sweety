'use client';

import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import type { Reading } from '@/lib/types';
import GlucoseBadge from '@/components/GlucoseBadge';
import { Button } from '@/components/ui/button';

ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid themed with the same CSS variables as the shadcn components.
const theme = themeQuartz.withParams({
  fontFamily: 'inherit',
  fontSize: 14,
  backgroundColor: 'var(--card)',
  foregroundColor: 'var(--foreground)',
  borderColor: 'var(--border)',
  accentColor: 'var(--primary)',
  headerBackgroundColor: 'var(--muted)',
  headerTextColor: 'var(--muted-foreground)',
  headerFontWeight: 500,
  headerFontSize: 13,
  rowHoverColor: 'color-mix(in oklch, var(--muted) 70%, transparent)',
  wrapperBorderRadius: 10,
  headerHeight: 40,
  rowHeight: 48,
  cellHorizontalPadding: 14,
});

interface Props {
  rows: Reading[];
  loading?: boolean;
  /** Show Edit/Delete buttons */
  onEdit?: (reading: Reading) => void;
  onDelete?: (reading: Reading) => void;
  showDate?: boolean;
}

export default function ReadingsGrid({ rows, loading, onEdit, onDelete, showDate = true }: Props) {
  const columnDefs = useMemo<ColDef<Reading>[]>(() => {
    const cols: ColDef<Reading>[] = [];
    if (showDate) {
      cols.push({
        field: 'date',
        headerName: 'Date',
        valueFormatter: (p) => (p.value ? formatDate(p.value) : ''),
        minWidth: 120,
      });
    }
    cols.push(
      { field: 'slotLabel', headerName: 'Time slot', minWidth: 140 },
      {
        field: 'value',
        headerName: 'Glucose (mg/dl)',
        minWidth: 170,
        cellRenderer: (p: ICellRendererParams<Reading, number>) =>
          p.value != null ? <GlucoseBadge value={p.value} /> : null,
      }
    );
    if (onEdit || onDelete) {
      cols.push({
        headerName: '',
        colId: 'actions',
        sortable: false,
        resizable: false,
        minWidth: 96,
        maxWidth: 104,
        cellRenderer: (p: ICellRendererParams<Reading>) =>
          p.data ? (
            <div className="cell-center justify-end">
              {onEdit && (
                <Button variant="ghost" size="icon-sm" aria-label="Edit reading" onClick={() => onEdit(p.data!)}>
                  <Pencil />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete reading"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(p.data!)}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ) : null,
      });
    }
    return cols;
  }, [onEdit, onDelete, showDate]);

  return (
    <AgGridReact<Reading>
      theme={theme}
      rowData={rows}
      columnDefs={columnDefs}
      defaultColDef={{ flex: 1, sortable: true, resizable: true }}
      domLayout="autoHeight"
      loading={loading}
      getRowId={(p) => String(p.data.id)}
      overlayNoRowsTemplate="<span style='color: var(--muted-foreground)'>No readings yet - add your first one.</span>"
      suppressCellFocus
    />
  );
}
