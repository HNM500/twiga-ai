'use client';

import { type FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { TWIGA_FEATURES } from '@/lib/twiga-features';

type RecoveryMode = 'request' | 'reset';

export function PasswordRecoveryCard({ mode }: { mode: RecoveryMode }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!TWIGA_FEATURES.emailDelivery) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="font-be-vietnam-pro text-2xl font-medium tracking-tight">Password recovery</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Email recovery is not available yet. Contact{' '}
          <a href="mailto:support@twiga.ai" className="font-medium text-foreground hover:underline">
            support@twiga.ai
          </a>{' '}
          if you need help accessing your account.
        </p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/sign-in">Return to sign in</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === 'reset' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    if (mode === 'reset' && !token) {
      setError('This password reset link is invalid or has expired.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'request') {
        await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: '/reset-password',
        });
        // Always show the same response so the form never reveals whether an account exists.
        setComplete(true);
        return;
      }

      const result = await authClient.resetPassword({ newPassword: password, token: token! });
      if (result.error) {
        setError('This password reset link is invalid or has expired. Request a new one and try again.');
        return;
      }
      setComplete(true);
    } catch {
      setError('We could not complete that request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (complete) {
    return (
      <div className="mx-auto w-full max-w-sm text-center" role="status">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" />
        </span>
        <h1 className="mt-5 font-be-vietnam-pro text-2xl font-medium tracking-tight">
          {mode === 'request' ? 'Check your email' : 'Password updated'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {mode === 'request'
            ? 'If a Twiga account exists for that address, we sent a secure password reset link.'
            : 'Your password has been changed. You can now sign in with your new password.'}
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/sign-in">Return to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="font-be-vietnam-pro text-3xl font-light tracking-tight">
          {mode === 'request' ? 'Reset your password' : 'Choose a new password'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {mode === 'request'
            ? 'Enter the email address linked to your Twiga account.'
            : 'Use 12 or more characters for your new password.'}
        </p>
      </div>

      {mode === 'reset' && (errorParam || !token) ? (
        <div
          className="mb-4 flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>This password reset link is invalid or has expired.</span>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'request' ? (
          <div className="space-y-1.5">
            <Label htmlFor="recovery-email">Email</Label>
            <Input
              id="recovery-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              disabled={loading}
              className="h-11"
              placeholder="you@example.com"
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                  disabled={loading || !token}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={12}
                maxLength={128}
                required
                disabled={loading || !token}
                className="h-11"
              />
            </div>
          </>
        )}

        {error ? (
          <div
            className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={loading || (mode === 'reset' && !token)}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {loading ? 'Please wait…' : mode === 'request' ? 'Send reset link' : 'Update password'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered your password?{' '}
        <Link href="/sign-in" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
