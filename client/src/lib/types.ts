export type Slot = 'MORNING_FASTING' | 'AFTER_BREAKFAST' | 'AFTER_LUNCH' | 'AFTER_DINNER';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Reading {
  id: number;
  date: string; // YYYY-MM-DD
  slot: Slot;
  slotLabel: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingInput {
  date: string;
  slot: Slot;
  value: number;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReportSummary {
  range: { from: string; to: string };
  count: number;
  highest: number | null;
  lowest: number | null;
  average: number | null;
}

export interface ReportsResponse {
  date: string;
  daily: ReportSummary & { readings: Reading[] };
  monthToDate: ReportSummary & { readings: Reading[] };
  previousMonth: ReportSummary;
}

/** Error body returned by the API. `field` says which input the message belongs to. */
export interface ApiErrorBody {
  error: string;
  field?: string;
}
