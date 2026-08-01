import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';

import {
  getSessionRequestCookie,
  isAdminReauthenticationRequest,
  isSessionCookieName,
  isCookieDomainTarget,
  resolvePublicAuthOrigin,
  resolveTrustedAuthRedirect,
} from '@/lib/auth-redirect';
import { proxy } from '@/proxy';
import { ADMIN_SESSION_MAX_AGE_MS, isAdminSessionFresh } from '@/lib/admin/session-policy';

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

  test('uses the configured public auth origin behind Railway forwarding', () => {
    expect(resolvePublicAuthOrigin('http://0.0.0.0:8080/api/admin-auth-handoff', 'https://twiga.ai')).toBe(
      'https://twiga.ai',
    );
    expect(resolvePublicAuthOrigin('https://twiga.ai/sign-in', 'not-a-url')).toBe('https://twiga.ai');
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
    expect(isSessionCookieName('__Secure-better-auth.session_token')).toBe(true);
    expect(isSessionCookieName('attacker-cookie')).toBe(false);
  });

  test('enforces the eight-hour administrator session age', () => {
    const now = Date.parse('2026-08-01T12:00:00.000Z');
    expect(isAdminSessionFresh({ createdAt: new Date(now - ADMIN_SESSION_MAX_AGE_MS) }, now)).toBe(true);
    expect(isAdminSessionFresh({ createdAt: new Date(now - ADMIN_SESSION_MAX_AGE_MS - 1) }, now)).toBe(false);
    expect(isAdminSessionFresh({ createdAt: 'invalid' }, now)).toBe(false);
  });

  test('allows only trusted administrator reauthentication requests through the auth guard', async () => {
    const target = encodeURIComponent('https://admin.twiga.ai/');
    const requestUrl = `https://twiga.ai/sign-in?redirect=${target}&reauth=admin`;
    expect(isAdminReauthenticationRequest(requestUrl, origins)).toBe(true);
    expect(
      isAdminReauthenticationRequest(
        `https://twiga.ai/sign-in?redirect=${encodeURIComponent('https://attacker.example')}&reauth=admin`,
        origins,
      ),
    ).toBe(false);

    const response = await proxy(
      new NextRequest(requestUrl, { headers: { cookie: '__Secure-better-auth.session_token=stale-token' } }),
    );
    expect(response.status).toBe(200);
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
