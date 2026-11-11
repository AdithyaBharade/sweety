'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { getApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { validateAuthForm, type AuthFieldErrors } from '@/lib/authValidation';
import Logo from '@/components/Logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'login' | 'register';

// The demo account has a public password, so only advertise it where it is meant to exist.
const SHOW_DEMO_LOGIN = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true';

/** Shared form for the login and sign-up pages. */
export default function AuthForm({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  // `error` is from the API; `fieldErrors` are the instant client-side checks.
  const [error, setError] = useState<{ error: string; field?: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setError(null);
    setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateAuthForm(values, mode);
    setFieldErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      if (isRegister) await register(values.name, values.email, values.password);
      else await login(values.email, values.password);
      router.replace('/dashboard');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const messageFor = (f: keyof AuthFieldErrors) => fieldErrors[f] ?? (error?.field === f ? error.error : undefined);
  const fieldError = (f: keyof AuthFieldErrors) => {
    const message = messageFor(f);
    return message ? <p className="text-sm text-destructive">{message}</p> : null;
  };

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="text-xl" />
          <p className="text-sm text-muted-foreground">Your daily blood glucose diary</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isRegister ? 'Create your account' : 'Welcome back'}</CardTitle>
            <CardDescription>
              {isRegister ? 'Start tracking your readings in seconds.' : 'Log in to see your readings.'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              {error && !error.field && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{error.error}</AlertDescription>
                </Alert>
              )}

              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={values.name} onChange={set('name')} autoComplete="name" aria-invalid={!!messageFor('name')} />
                  {fieldError('name')}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={set('email')}
                  autoComplete="email"
                  aria-invalid={!!messageFor('email')}
                />
                {fieldError('email')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pr-10"
                    value={values.password}
                    onChange={set('password')}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    aria-invalid={!!messageFor('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {isRegister && !messageFor('password') && (
                  <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                )}
                {fieldError('password')}
              </div>
            </CardContent>

            <CardFooter className="mt-6 flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {isRegister ? 'Sign up' : 'Log in'}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isRegister ? (
                  <>
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
                  </>
                ) : (
                  <>
                    New to Sweety?{' '}
                    <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link>
                  </>
                )}
              </p>
            </CardFooter>
          </form>
        </Card>

        {!isRegister && SHOW_DEMO_LOGIN && (
          <p className="rounded-lg border border-dashed bg-background px-3 py-2 text-center text-xs text-muted-foreground">
            Demo account: <span className="font-mono">demo@sweety.app</span> / <span className="font-mono">demo1234</span>
          </p>
        )}
      </div>
    </main>
  );
}
