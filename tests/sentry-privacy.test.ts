import { describe, expect, test } from 'bun:test';
import type { Event } from '@sentry/nextjs';
import { scrubSentryEvent } from '@/lib/sentry-privacy';

describe('Sentry privacy scrubber', () => {
  test('removes request bodies, cookies, queries and personal user fields', () => {
    const event = scrubSentryEvent({
      user: { id: 'user-1', email: 'person@example.com', ip_address: '127.0.0.1' },
      request: { data: { prompt: 'private question' }, cookies: { session: 'secret' }, query_string: 'q=private', headers: { authorization: 'Bearer token', cookie: 'session=secret', accept: 'text/html' } },
      message: 'Failed for person@example.com and +255 712 345 678',
      breadcrumbs: [{ message: 'Bearer abcdefghijklmnopqrstuvwxyz1234567890', data: { prompt: 'private' } }],
    } as Event);
    expect(event?.user).toEqual({ id: 'user-1' });
    expect(event?.request?.data).toBeUndefined();
    expect(event?.request?.cookies).toBeUndefined();
    expect(event?.request?.query_string).toBeUndefined();
    expect(event?.request?.headers).toEqual({ accept: 'text/html' });
    expect(event?.message).not.toContain('person@example.com');
    expect(event?.message).not.toContain('+255');
    expect(event?.breadcrumbs?.[0]?.data).toBeUndefined();
  });
});
