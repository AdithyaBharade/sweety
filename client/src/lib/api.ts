import axios from 'axios';
import type {
  ApiErrorBody,
  AuthResponse,
  Paginated,
  Reading,
  ReadingInput,
  ReportsResponse,
  User,
} from './types';

export const TOKEN_KEY = 'sweety_token';

export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT to every request.
http.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token expired, clear it and send the user to the login page.
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = String(error.config?.url || '').startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthCall && typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Pulls the user-friendly message (and field) out of an API error. */
export function getApiError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (error.response?.data?.error) return error.response.data;
    if (!error.response) return { error: 'Cannot reach the server. Is the API running?' };
  }
  return { error: 'Something went wrong. Please try again.' };
}

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    http.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    http.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  me: () => http.get<{ user: User }>('/auth/me').then((r) => r.data.user),
};

export const readingsApi = {
  list: (params: { page?: number; limit?: number; from?: string; to?: string } = {}) =>
    http.get<Paginated<Reading>>('/readings', { params }).then((r) => r.data),
  create: (body: ReadingInput) => http.post<Reading>('/readings', body).then((r) => r.data),
  update: (id: number, body: ReadingInput) =>
    http.put<Reading>(`/readings/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete(`/readings/${id}`),
};

export const reportsApi = {
  get: (date: string) => http.get<ReportsResponse>('/reports', { params: { date } }).then((r) => r.data),
};
