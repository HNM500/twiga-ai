import type { Event, EventHint } from '@sentry/nextjs';

function scrub(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
    .replace(/(?:bearer\s+)?[A-Za-z0-9_-]{32,}/gi, '[secret]');
}

export function scrubSentryEvent<T extends Event>(event: T, _hint?: EventHint): T | null {
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.request) {
    event.request.data = undefined;
    event.request.cookies = undefined;
    event.request.query_string = undefined;
    if (event.request.headers) {
      const { authorization: _authorization, cookie: _cookie, ...safeHeaders } = event.request.headers;
      event.request.headers = safeHeaders;
    }
  }
  if (event.message) event.message = scrub(event.message).slice(0, 500);
  for (const value of event.exception?.values || []) {
    if (value.value) value.value = scrub(value.value).slice(0, 500);
  }
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    message: breadcrumb.message ? scrub(breadcrumb.message).slice(0, 300) : undefined,
    data: undefined,
  }));
  return event;
}
