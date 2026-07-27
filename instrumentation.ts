import type { Instrumentation } from 'next';
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    const { patchGlobalWebStreams } = await import('experimental-fast-webstreams');
    patchGlobalWebStreams();
  }
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config');
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { logOperationalError } = await import('@/lib/observability');
  logOperationalError('unhandled_request_error', error, {
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
  });
  Sentry.captureRequestError(error, request, context);
};
