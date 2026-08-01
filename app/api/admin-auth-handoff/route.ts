import { NextRequest, NextResponse } from 'next/server';

import {
  getSessionRequestCookie,
  isCookieDomainTarget,
  resolvePublicAuthOrigin,
  resolveTrustedAuthRedirect,
} from '@/lib/auth-redirect';
import { isAdminSessionFresh } from '@/lib/admin/session-policy';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function expireSessionCookie(response: NextResponse, cookie: { name: string }, secure: boolean, domain?: string) {
  response.cookies.set(cookie.name, '', {
    ...(domain ? { domain } : {}),
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure,
  });
}

function adminSignInUrl(publicOrigin: string, target: URL) {
  const signIn = new URL('/sign-in', publicOrigin);
  signIn.searchParams.set('redirect', target.toString());
  signIn.searchParams.set('reauth', 'admin');
  return signIn;
}

export async function GET(request: NextRequest) {
  const publicOrigin = resolvePublicAuthOrigin(request.url, process.env.BETTER_AUTH_BASE_URL);
  const target = resolveTrustedAuthRedirect(request.url, process.env.ALLOWED_ORIGINS);
  if (!target) return NextResponse.redirect(new URL('/', publicOrigin));

  const session = await auth.api.getSession({ headers: request.headers });
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || '';
  const sessionCookie = getSessionRequestCookie(request.cookies.getAll());
  const secure = new URL(publicOrigin).protocol === 'https:';

  const clearingStaleSharedCookie = request.nextUrl.searchParams.get('reauth') === 'shared';
  if (clearingStaleSharedCookie && (!session || !isAdminSessionFresh(session.session))) {
    const response = NextResponse.redirect(adminSignInUrl(publicOrigin, target));
    if (sessionCookie && cookieDomain) expireSessionCookie(response, sessionCookie, secure, cookieDomain);
    return response;
  }

  if (session && !isAdminSessionFresh(session.session)) {
    const responseTarget = cookieDomain
      ? new URL('/api/admin-auth-handoff', publicOrigin)
      : adminSignInUrl(publicOrigin, target);
    if (cookieDomain) {
      responseTarget.searchParams.set('redirect', target.toString());
      responseTarget.searchParams.set('reauth', 'shared');
    }

    const response = NextResponse.redirect(responseTarget);
    if (sessionCookie) expireSessionCookie(response, sessionCookie, secure);
    return response;
  }

  if (!session) {
    const clearingSharedCookie = request.nextUrl.searchParams.get('clear') === 'shared';

    if (sessionCookie && cookieDomain && !clearingSharedCookie) {
      const retry = new URL('/api/admin-auth-handoff', publicOrigin);
      retry.searchParams.set('redirect', target.toString());
      retry.searchParams.set('clear', 'shared');
      const response = NextResponse.redirect(retry);
      expireSessionCookie(response, sessionCookie, secure);
      return response;
    }

    const signIn = new URL('/sign-in', publicOrigin);
    signIn.searchParams.set('redirect', target.toString());
    const response = NextResponse.redirect(signIn);
    if (sessionCookie)
      expireSessionCookie(response, sessionCookie, secure, clearingSharedCookie ? cookieDomain : undefined);
    return response;
  }

  const response = NextResponse.redirect(target);
  response.headers.set('cache-control', 'no-store');

  if (sessionCookie && cookieDomain && isCookieDomainTarget(target, cookieDomain)) {
    response.cookies.set(sessionCookie.name, sessionCookie.value, {
      domain: cookieDomain,
      expires: new Date(session.session.expiresAt),
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  }

  return response;
}
