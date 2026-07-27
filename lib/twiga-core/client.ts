import 'server-only';

import { createTwigaCoreAssertion } from '@/lib/twiga-core/assertion';

export interface TwigaBankDirectoryProfile {
  public_id: string;
  entity_kind: 'licensed_institution';
  canonical_name: string;
  operating_status: string;
  fields: Record<string, unknown>;
  provenance: Array<{
    source: string;
    observationId: string;
    observedAt: string;
    attributionRequired: boolean;
    attribution?: string | null;
  }>;
  mapActions: {
    viewOnGoogleMaps: string;
    findBranch: string;
    findAtm: string;
  };
}

export class TwigaCoreClient {
  constructor(private readonly config: { baseUrl: string; assertionSecret: string }) {}

  async searchBanks(query: string, limit = 5): Promise<TwigaBankDirectoryProfile[]> {
    const url = new URL('/v1/directory/banks', normalizedBaseUrl(this.config.baseUrl));
    url.searchParams.set('q', query.trim());
    url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 10)));
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${createTwigaCoreAssertion({
          secret: this.config.assertionSecret,
          subject: 'twiga-web:business-directory-tool',
          scopes: ['directory:read'],
        })}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Twiga business directory is temporarily unavailable (${response.status})`);
    const payload = (await response.json()) as { results?: TwigaBankDirectoryProfile[] };
    return Array.isArray(payload.results) ? payload.results : [];
  }
}

function normalizedBaseUrl(value: string): URL {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('TWIGA_CORE_URL must use HTTP or HTTPS');
  return url;
}
