import 'server-only';

import { createTwigaCoreAssertion } from '@/lib/twiga-core/assertion';
import { serverEnv } from '@/env/server';
import { maindb } from '@/lib/db';
import { adminAuditLog } from '@/lib/db/schema';
import { AdminAccessError, type AdminActor } from '@/lib/admin/security';
import { dataPlatformOverviewSchema } from '@/lib/admin/data-platform-contract';

function coreUrl(path: string) {
  return new URL(path, serverEnv.TWIGA_CORE_URL.endsWith('/') ? serverEnv.TWIGA_CORE_URL : `${serverEnv.TWIGA_CORE_URL}/`);
}

async function coreAdminRequest<T>(actor: AdminActor, path: string, scope: 'data-platform:read' | 'reviews:read' | 'reviews:write', init?: RequestInit) {
  const response = await fetch(coreUrl(path), {
    ...init,
    headers: {
      authorization: `Bearer ${createTwigaCoreAssertion({
        secret: serverEnv.TWIGA_CORE_ASSERTION_SECRET,
        subject: `twiga-admin:${actor.userId}`,
        scopes: [scope],
      })}`,
      accept: 'application/json',
      'content-type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = response.status >= 500 ? 502 : response.status;
    throw new AdminAccessError(status, typeof body.error === 'string' ? body.error : 'Twiga Data Platform request failed');
  }
  return body as T;
}

export async function getDataPlatformOverview(actor: AdminActor) {
  const body = await coreAdminRequest<unknown>(actor, '/internal/v1/admin/data-platform/overview', 'data-platform:read');
  const parsed = dataPlatformOverviewSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible dashboard contract');
  return parsed.data;
}

export function getDataPlatformEntityReviews(actor: AdminActor, input: { state?: string; priority?: string; limit?: number }) {
  const url = coreUrl('/internal/v1/reviews/entity-matches');
  if (input.state) url.searchParams.set('state', input.state);
  if (input.priority) url.searchParams.set('priority', input.priority);
  if (input.limit) url.searchParams.set('limit', String(input.limit));
  return coreAdminRequest(actor, `${url.pathname}${url.search}`, 'reviews:read');
}

export async function resolveDataPlatformEntityReview(
  actor: AdminActor,
  reviewPublicId: string,
  input: { action: 'create_new' | 'link_existing' | 'dismiss'; organizationPublicId?: string; reason: string },
) {
  const requestId = crypto.randomUUID();
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.primaryRole,
    action: `data_platform.entity_match.${input.action}.requested`,
    targetType: 'entity_match_review',
    targetId: reviewPublicId,
    reason: input.reason,
    requestId,
    beforeState: { state: 'open' },
    afterState: null,
    metadata: { service: 'twiga-core' },
  });
  const result = await coreAdminRequest<Record<string, unknown>>(
    actor,
    `/internal/v1/reviews/entity-matches/${encodeURIComponent(reviewPublicId)}/resolve`,
    'reviews:write',
    {
      method: 'POST',
      body: JSON.stringify({
        action: input.action,
        organizationPublicId: input.organizationPublicId,
        note: input.reason,
      }),
    },
  );
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.primaryRole,
    action: `data_platform.entity_match.${input.action}`,
    targetType: 'entity_match_review',
    targetId: reviewPublicId,
    reason: input.reason,
    requestId,
    beforeState: null,
    afterState: result,
    metadata: { service: 'twiga-core' },
  });
  return { ok: true, requestId, result };
}
