import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from '@/lib/sentry-privacy';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SOURCE_REVISION,
  sendDefaultPii: false,
  tracesSampleRate: 0.03,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend: scrubSentryEvent,
  beforeSendTransaction: scrubSentryEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
