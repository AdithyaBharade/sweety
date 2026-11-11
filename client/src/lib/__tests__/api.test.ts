import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi, http, readingsApi, TOKEN_KEY } from '../api';

/** Replaces the network with a fake that records each request and answers with `status`. */
function fakeServer(status = 200) {
  const seen: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    const response = { data: {}, status, statusText: '', headers: {}, config };
    if (status >= 400) throw new AxiosError('fail', String(status), config, null, response);
    return response;
  };
  http.defaults.adapter = adapter;
  return seen;
}

describe('api client', () => {
  const originalAdapter = http.defaults.adapter;
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    // jsdom can't navigate, so replace location with a plain object we can inspect.
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '/dashboard' } });
  });

  afterEach(() => {
    http.defaults.adapter = originalAdapter;
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it("sends the token and the browser's time zone", async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Australia/Sydney',
    } as Intl.ResolvedDateTimeFormatOptions);
    localStorage.setItem(TOKEN_KEY, 'abc');
    const seen = fakeServer();

    await readingsApi.list();

    expect(seen[0].headers.Authorization).toBe('Bearer abc');
    expect(seen[0].headers['X-Timezone']).toBe('Australia/Sydney');
    vi.restoreAllMocks();
  });

  it('clears the token and goes to /login when the session has expired (401)', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired');
    fakeServer(401);

    await expect(readingsApi.list()).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('does not redirect on a failed login (401 from /auth/*)', async () => {
    fakeServer(401);
    await expect(authApi.login({ email: 'a@b.co', password: 'nope' })).rejects.toBeInstanceOf(AxiosError);
    expect(window.location.href).toBe('/dashboard');
  });

  it('logout sends the token it was given, even after it was removed from storage', async () => {
    const seen = fakeServer(204);
    await authApi.logout('old-token');
    expect(seen[0].url).toBe('/auth/logout');
    expect(seen[0].headers.Authorization).toBe('Bearer old-token');
  });
});
