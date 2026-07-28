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

export interface TwigaBankCatalogEntry {
  public_id: string;
  canonical_name: string;
  operating_status: string;
  institution_type: string | null;
  licence_status: string | null;
}

export interface TwigaDirectoryResponse<T> {
  results: T[];
  count: number;
  total: number;
  hasMore: boolean;
}

export function normalizeDirectoryResponse<T>(payload: unknown): TwigaDirectoryResponse<T> {
  const candidate = isRecord(payload) ? payload : {};
  const results = Array.isArray(candidate.results) ? (candidate.results as T[]) : [];
  const count = nonNegativeInteger(candidate.count) ?? results.length;
  const total = Math.max(nonNegativeInteger(candidate.total) ?? count, count);
  const hasMore = typeof candidate.hasMore === 'boolean' ? candidate.hasMore : count < total;
  return { results, count, total, hasMore };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}
