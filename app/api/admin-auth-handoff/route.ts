import { NextRequest, NextResponse } from 'next/server';

import {
  getSessionRequestCookie,
  isCookieDomainTarget,
  resolvePublicAuthOrigin,
  resolveTrustedAuthRedirect,
} from '@/lib/auth-redirect';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function clearSessionCookies(response: NextResponse, request: NextRequest, cookieDomain: string) {
  for (const cookie of request.cookies.getAll()) {
    if (!getSessionRequestCookie([cookie])) continue;
    response.cookies.set(cookie.name, '', { httpOnly: true, maxAge: 0, path: '/', sameSite: 'lax', secure: true });
    if (cookieDomain) {
      // ResponseCookies replaces cookies by name, so append the parent-domain
      // expiry separately to clear both legacy host-only and shared cookies.
      response.headers.append(
        'set-cookie',
        `${cookie.name}=; Path=/; Max-Age=0; Domain=${cookieDomain}; HttpOnly; Secure; SameSite=Lax`,
      );
    }
  }
}

export async function GET(request: NextRequest) {
  const publicOrigin = resolvePublicAuthOrigin(request.url, process.env.BETTER_AUTH_BASE_URL);
  const target = resolveTrustedAuthRedirect(request.url, process.env.ALLOWED_ORIGINS);
  if (!target) return NextResponse.redirect(new URL('/', publicOrigin));

  const session = await auth.api.getSession({ headers: request.headers });
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || '';

  if (!session) {
    const signIn = new URL('/sign-in', publicOrigin);
    signIn.searchParams.set('redirect', target.toString());
    const response = NextResponse.redirect(signIn);
    clearSessionCookies(response, request, cookieDomain);
    return response;
  }

  const response = NextResponse.redirect(target);
  response.headers.set('cache-control', 'no-store');

  const sessionCookie = getSessionRequestCookie(request.cookies.getAll());
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
