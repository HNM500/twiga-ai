import 'server-only';

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  level: string;
  count: string;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
}

function scrub(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
    .replace(/(?:bearer\s+)?[A-Za-z0-9_-]{32,}/gi, '[secret]')
    .slice(0, 180);
}

function safeSentryUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && (url.hostname === 'sentry.io' || url.hostname.endsWith('.sentry.io'))) {
      return url.toString();
    }
  } catch {
    // Fall through to the neutral Sentry landing page.
  }
  return 'https://sentry.io/';
}

export async function getSanitizedSentryIssues() {
  const token = process.env.SENTRY_AUTH_TOKEN?.trim();
  const organization = process.env.SENTRY_ORG?.trim();
  const project = process.env.SENTRY_PROJECT?.trim();
  if (!token || !organization || !project) {
    return { configured: false as const, issues: [] };
  }

  const params = new URLSearchParams({ query: 'is:unresolved', sort: 'freq', limit: '10' });
  const response = await fetch(
    `https://sentry.io/api/0/projects/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/issues/?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    },
  );

  if (!response.ok) {
    return { configured: true as const, available: false as const, issues: [] };
  }

  const issues = (await response.json()) as SentryIssue[];
  return {
    configured: true as const,
    available: true as const,
    issues: issues.map((issue) => ({
      id: issue.id,
      shortId: issue.shortId,
      summary: scrub(issue.title),
      location: scrub(issue.culprit || 'Unknown location'),
      level: issue.level,
      count: Number.parseInt(issue.count, 10) || 0,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      url: safeSentryUrl(issue.permalink),
    })),
  };
}
