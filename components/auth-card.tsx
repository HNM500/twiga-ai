'use client';

import { type FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient, signIn, signUp } from '@/lib/auth-client';
import { TWIGA_FEATURES } from '@/lib/twiga-features';

type AuthIconProps = React.ComponentProps<'svg'>;

function GoogleIcon(props: AuthIconProps) {
  return (
    <svg viewBox="0 0 256 262" preserveAspectRatio="xMidYMid" {...props}>
      <path
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
        fill="#4285F4"
      />
      <path
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
        fill="#34A853"
      />
      <path
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
        fill="#FBBC05"
      />
      <path
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 64.414-54.251"
        fill="#EB4335"
      />
    </svg>
  );
}

interface AuthCardProps {
  title: string;
  description: string;
  mode?: 'sign-in' | 'sign-up';
  verificationRequired?: boolean;
}

function getErrorMessage(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return null;
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD') return 'The email or password is incorrect.';
  if (error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') return 'An account already exists for this email.';
  if (error.code === 'EMAIL_NOT_VERIFIED') return 'Please verify your email before signing in.';
  if (error.code === 'TOO_MANY_REQUESTS') return 'Too many attempts. Please wait a minute and try again.';
  return error.message || 'We could not complete that request. Please try again.';
}

function localRedirect(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function AuthCard({
  title,
  description,
  mode = 'sign-in',
  verificationRequired = false,
}: AuthCardProps) {
  const [redirect] = useQueryState('redirect', parseAsString.withDefault('/'));
  const [reauth] = useQueryState('reauth', parseAsString.withDefault(''));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const lastMethod = authClient.getLastUsedLoginMethod();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'sign-up') {
        const result = await signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: localRedirect(redirect),
        });

        const message = getErrorMessage(result.error);
        if (message) {
          setError(message);
          return;
        }

        if (verificationRequired) {
          setVerificationSent(true);
          return;
        }

        window.location.assign(localRedirect(redirect));
        return;
      }

      const result = await signIn.email({
        email: email.trim(),
        password,
        callbackURL: redirect,
        rememberMe: true,
      });
      const message = getErrorMessage(result.error);
      if (message) setError(message);
    } catch {
      setError('We could not connect to Twiga. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (verificationSent) {
    return (
      <div className="mx-auto w-full max-w-sm text-center" role="status">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" />
        </span>
        <h1 className="mt-5 font-be-vietnam-pro text-2xl font-medium tracking-tight">Check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{email}</span>. Open it to finish
          creating your Twiga account.
        </p>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link href="/sign-in">Return to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="mb-2 font-be-vietnam-pro text-3xl font-light tracking-tight text-foreground">{title}</h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'sign-in' && reauth === 'admin' ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground" role="status">
            For Admin security, confirm your account by signing in again.
          </div>
        ) : null}
        {mode === 'sign-up' ? (
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
              disabled={loading}
              className="h-11"
              placeholder="Your name"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
            disabled={loading}
            className="h-11"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="password">Password</Label>
            {mode === 'sign-in' && TWIGA_FEATURES.emailDelivery ? (
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot password?
              </Link>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={12}
              maxLength={128}
              required
              disabled={loading}
              className="h-11 pr-11"
              placeholder={mode === 'sign-up' ? 'At least 12 characters' : 'Your password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {mode === 'sign-up' ? <p className="text-xs text-muted-foreground">Use 12 or more characters.</p> : null}
        </div>

        {error ? (
          <div
            className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      {TWIGA_FEATURES.googleAuth ? (
        <>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="relative w-full"
            disabled={googleLoading}
            onClick={async () => {
              await signIn.social(
                { provider: 'google', callbackURL: redirect },
                { onRequest: () => setGoogleLoading(true) },
              );
            }}
          >
            {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon className="size-4" />}
            Continue with Google
            {lastMethod === 'google' ? (
              <span className="absolute right-3 text-[10px] text-muted-foreground">Last used</span>
            ) : null}
          </Button>
        </>
      ) : null}

      <div className="mt-6 text-center">
        <span className="text-sm text-muted-foreground">
          {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
        </span>
        <Link
          href={
            mode === 'sign-in'
              ? `/sign-up${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`
              : `/sign-in${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`
          }
          className="text-sm font-medium text-foreground underline-offset-4 transition-colors hover:underline"
        >
          {mode === 'sign-in' ? 'Create one' : 'Sign in'}
        </Link>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="text-foreground/70 underline-offset-2 hover:text-foreground hover:underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy-policy"
          className="text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
