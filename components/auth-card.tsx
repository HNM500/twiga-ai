'use client';

import { useState } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { authClient, signIn } from '@/lib/auth-client';
import { TWIGA_FEATURES } from '@/lib/twiga-features';

interface AuthIconProps extends React.ComponentProps<'svg'> {}

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
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
        fill="#EB4335"
      />
    </svg>
  );
}
interface AuthCardProps {
  title: string;
  description: string;
  mode?: 'sign-in' | 'sign-up';
}

export default function AuthCard({ title, description, mode = 'sign-in' }: AuthCardProps) {
  const [redirect] = useQueryState('redirect', parseAsString.withDefault('/'));
  const [googleLoading, setGoogleLoading] = useState(false);
  const lastMethod = authClient.getLastUsedLoginMethod();

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="mb-3 font-be-vietnam-pro text-3xl font-light tracking-tight text-foreground">{title}</h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {mode === 'sign-up' ? (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {['Save conversations', 'Sync preferences', 'Connect Twiga Apps'].map((label) => (
            <span key={label} className="rounded-full bg-muted/40 px-2.5 py-1 text-[10px] text-muted-foreground">
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {TWIGA_FEATURES.googleAuth ? (
        <button
          className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border/60 bg-background text-sm transition-all duration-200 hover:border-foreground/15 hover:bg-muted/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={googleLoading}
          onClick={async () => {
            await signIn.social(
              { provider: 'google', callbackURL: redirect },
              { onRequest: () => setGoogleLoading(true) },
            );
          }}
        >
          <span className="flex h-5 w-5 items-center justify-center">
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
          </span>
          <span className="font-medium text-foreground/80 transition-colors group-hover:text-foreground">
            Continue with Google
          </span>
          {lastMethod === 'google' ? (
            <span className="absolute right-3 font-pixel text-[9px] uppercase tracking-wider text-primary/70">
              Last used
            </span>
          ) : null}
        </button>
      ) : (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center">
          <p className="text-sm font-medium text-foreground">Account sign-in is coming soon</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            You can use Twiga without an account while we finish Google sign-in and account data controls.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Continue to Twiga
          </Link>
        </div>
      )}

      {TWIGA_FEATURES.googleAuth ? (
        <div className="mt-8 text-center">
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
            {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
          </Link>
        </div>
      ) : null}

      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="text-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy-policy"
          className="text-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
