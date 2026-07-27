import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from '@/lib/sentry-privacy';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV,
  release: process.env.SOURCE_REVISION || process.env.RAILWAY_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrubSentryEvent,
  beforeSendTransaction: scrubSentryEvent,
});
