const SESSION_COOKIE_NAMES = new Set([
  'better-auth.session_token',
  'better-auth-session_token',
  '__Secure-better-auth.session_token',
  '__Secure-better-auth-session_token',
]);

export type RequestCookie = { name: string; value: string };

export function resolvePublicAuthOrigin(requestUrl: string, configuredBaseUrl = '') {
  if (configuredBaseUrl) {
    try {
      const configured = new URL(configuredBaseUrl);
      if (configured.protocol === 'http:' || configured.protocol === 'https:') return configured.origin;
    } catch {
      // Fall back to the request origin when configuration is absent or invalid.
    }
  }
  return new URL(requestUrl).origin;
}

export function resolveTrustedAuthRedirect(requestUrl: string, configuredOrigins = '') {
  const request = new URL(requestUrl);
  const rawRedirect = request.searchParams.get('redirect');
  if (!rawRedirect) return null;

  let target: URL;
  try {
    target = new URL(rawRedirect, request.origin);
  } catch {
    return null;
  }

  const allowedOrigins = new Set(
    configuredOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => {
        try {
          return new URL(origin).origin;
        } catch {
          return '';
        }
      })
      .filter(Boolean),
  );
  allowedOrigins.add(request.origin);

  if (!allowedOrigins.has(target.origin) || target.username || target.password) return null;
  return target;
}

export function getSessionRequestCookie(cookies: RequestCookie[]) {
  return cookies.find((cookie) => SESSION_COOKIE_NAMES.has(cookie.name)) ?? null;
}

export function isCookieDomainTarget(target: URL, cookieDomain: string) {
  const normalizedDomain = cookieDomain.trim().replace(/^\./, '').toLowerCase();
  const hostname = target.hostname.toLowerCase();
  return Boolean(normalizedDomain) && (hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`));
}
