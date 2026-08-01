import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { isAdminReauthenticationRequest, resolveTrustedAuthRedirect } from '@/lib/auth-redirect';

const authRoutes = ['/sign-in', '/sign-up'];
const protectedRoutes = ['/settings', '/searches'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/search') return NextResponse.next();
  if (pathname.startsWith('/new') || pathname.startsWith('/api/search')) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  // Allow /settings as a real page; still protect it behind auth
  if (pathname === '/settings') {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    return NextResponse.next();
  }

  // If user is authenticated but trying to access auth routes
  if (
    sessionCookie &&
    authRoutes.some((route) => pathname.startsWith(route)) &&
    !isAdminReauthenticationRequest(request.url, process.env.ALLOWED_ORIGINS)
  ) {
    const target = resolveTrustedAuthRedirect(request.url, process.env.ALLOWED_ORIGINS);
    if (target && target.origin !== request.nextUrl.origin) {
      const handoff = new URL('/api/admin-auth-handoff', request.url);
      handoff.searchParams.set('redirect', target.toString());
      return NextResponse.redirect(handoff);
    }
    return NextResponse.redirect(target || new URL('/', request.url));
  }

  if (!sessionCookie && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
