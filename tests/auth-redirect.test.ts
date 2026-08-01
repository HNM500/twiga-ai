import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';

import { getSessionRequestCookie, isCookieDomainTarget, resolveTrustedAuthRedirect } from '@/lib/auth-redirect';
import { proxy } from '@/proxy';

const origins = 'https://twiga.ai,https://admin.twiga.ai';
const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

beforeAll(() => {
  process.env.ALLOWED_ORIGINS = origins;
});

afterAll(() => {
  process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
});

describe('authenticated redirects', () => {
  test('allows the configured admin origin', () => {
    const request = `https://twiga.ai/sign-in?redirect=${encodeURIComponent('https://admin.twiga.ai/data-platform')}`;
    expect(resolveTrustedAuthRedirect(request, origins)?.toString()).toBe('https://admin.twiga.ai/data-platform');
  });

  test('allows same-origin paths', () => {
    const request = `https://twiga.ai/sign-in?redirect=${encodeURIComponent('/settings')}`;
    expect(resolveTrustedAuthRedirect(request, origins)?.toString()).toBe('https://twiga.ai/settings');
  });

  test('rejects missing, untrusted, and credentialed redirects', () => {
    expect(resolveTrustedAuthRedirect('https://twiga.ai/sign-in', origins)).toBeNull();
    expect(
      resolveTrustedAuthRedirect(
        `https://twiga.ai/sign-in?redirect=${encodeURIComponent('https://attacker.example')}`,
        origins,
      ),
    ).toBeNull();
    expect(
      resolveTrustedAuthRedirect(
        `https://twiga.ai/sign-in?redirect=${encodeURIComponent('https://user@admin.twiga.ai')}`,
        origins,
      ),
    ).toBeNull();
  });

  test('finds Better Auth session cookies with production and development names', () => {
    expect(
      getSessionRequestCookie([
        { name: 'theme', value: 'dark' },
        { name: '__Secure-better-auth.session_token', value: 'signed-token' },
      ]),
    ).toEqual({ name: '__Secure-better-auth.session_token', value: 'signed-token' });
    expect(getSessionRequestCookie([{ name: 'better-auth.session_token', value: 'local-token' }])?.value).toBe(
      'local-token',
    );
  });

  test('limits shared cookies to the configured parent domain', () => {
    expect(isCookieDomainTarget(new URL('https://admin.twiga.ai'), '.twiga.ai')).toBe(true);
    expect(isCookieDomainTarget(new URL('https://twiga.ai'), '.twiga.ai')).toBe(true);
    expect(isCookieDomainTarget(new URL('https://fake-twiga.ai'), '.twiga.ai')).toBe(false);
  });

  test('routes an existing cross-origin session through the verified handoff', async () => {
    const request = new NextRequest(
      `https://twiga.ai/sign-in?redirect=${encodeURIComponent('https://admin.twiga.ai')}`,
      { headers: { cookie: '__Secure-better-auth.session_token=signed-token' } },
    );

    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      `https://twiga.ai/api/admin-auth-handoff?redirect=${encodeURIComponent('https://admin.twiga.ai/')}`,
    );
  });

  test('does not pass an untrusted redirect into the handoff', async () => {
    const request = new NextRequest(
      `https://twiga.ai/sign-in?redirect=${encodeURIComponent('https://attacker.example')}`,
      { headers: { cookie: '__Secure-better-auth.session_token=signed-token' } },
    );

    const response = await proxy(request);
    expect(response.headers.get('location')).toBe('https://twiga.ai/');
  });
});
