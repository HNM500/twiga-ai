import 'server-only';

import { createTwigaCoreAssertion } from '@/lib/twiga-core/assertion';
import { serverEnv } from '@/env/server';
import { maindb } from '@/lib/db';
import { adminAuditLog } from '@/lib/db/schema';
import { AdminAccessError, type AdminActor } from '@/lib/admin/security';
import {
  acquisitionDomainPolicyInputSchema,
  acquisitionDomainPolicyResultSchema,
  acquisitionPoliciesSchema,
  acquisitionSettingsUpdateResultSchema,
  acquisitionSettingsUpdateSchema,
  dataPlatformOverviewSchema,
  dataPlatformOrganizationDetailSchema,
  dataPlatformOrganizationListQuerySchema,
  dataPlatformOrganizationListSchema,
  dataPlatformRunDetailSchema,
  dataPlatformRunListQuerySchema,
  dataPlatformRunListSchema,
  dataPlatformReviewDetailSchema,
  dataPlatformReviewListQuerySchema,
  dataPlatformReviewListSchema,
  dataPlatformSourceDetailSchema,
  dataPlatformSourceListQuerySchema,
  dataPlatformSourceListSchema,
  evidenceGroupDetailSchema,
  evidenceGroupListQuerySchema,
  evidenceGroupListSchema,
  externalEvidenceListQuerySchema,
  externalEvidenceListSchema,
  externalEvidenceRequestInputSchema,
  externalEvidenceSubmitResultSchema,
  resolutionEvaluationSetDetailSchema,
  resolutionEvaluationSetConfirmationInputSchema,
  resolutionEvaluationSetConfirmationResultSchema,
  resolutionEvaluationSetListSchema,
  resolutionLabelReviewInputSchema,
  resolutionLabelReviewResultSchema,
  type ResolutionEvaluationSetConfirmationInput,
  type ResolutionLabelReviewInput,
  type ExternalEvidenceRequestInput,
  type AcquisitionDomainPolicyInput,
  type AcquisitionSettingsUpdateInput,
} from '@/lib/admin/data-platform-contract';

function coreUrl(path: string) {
  return new URL(path, serverEnv.TWIGA_CORE_URL.endsWith('/') ? serverEnv.TWIGA_CORE_URL : `${serverEnv.TWIGA_CORE_URL}/`);
}

async function coreAdminRequest<T>(actor: AdminActor, path: string, scope: 'data-platform:read' | 'data-platform:write' | 'reviews:read' | 'reviews:write', init?: RequestInit) {
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
    const message = typeof body.message === 'string'
      ? body.message
      : typeof body.error === 'string' ? body.error : 'Twiga Data Platform request failed';
    throw new AdminAccessError(status, message);
  }
  return body as T;
}

export async function getDataPlatformOverview(actor: AdminActor) {
  const body = await coreAdminRequest<unknown>(actor, '/internal/v1/admin/data-platform/overview', 'data-platform:read');
  const parsed = dataPlatformOverviewSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible dashboard contract');
  return parsed.data;
}

export async function getDataPlatformRuns(actor: AdminActor, rawInput: Record<string, string | undefined>) {
  const input = dataPlatformRunListQuerySchema.parse(rawInput);
  const url = coreUrl('/internal/v1/admin/data-platform/runs');
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const body = await coreAdminRequest<unknown>(actor, `${url.pathname}${url.search}`, 'data-platform:read');
  const parsed = dataPlatformRunListSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible run-list contract');
  return parsed.data;
}

export async function getDataPlatformRun(actor: AdminActor, publicId: string) {
  if (!/^run_[0-9a-f]{32}$/.test(publicId)) throw new AdminAccessError(400, 'Invalid ingestion run identifier');
  const body = await coreAdminRequest<unknown>(
    actor,
    `/internal/v1/admin/data-platform/runs/${encodeURIComponent(publicId)}`,
    'data-platform:read',
  );
  const parsed = dataPlatformRunDetailSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible run-detail contract');
  return parsed.data;
}

export async function getDataPlatformReviews(actor: AdminActor, rawInput: Record<string, string | undefined>) {
  const input = dataPlatformReviewListQuerySchema.parse(rawInput);
  const url = coreUrl('/internal/v1/admin/data-platform/reviews');
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const body = await coreAdminRequest<unknown>(actor, `${url.pathname}${url.search}`, 'data-platform:read');
  const parsed = dataPlatformReviewListSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible review-queue contract');
  return parsed.data;
}

export async function getDataPlatformReview(actor: AdminActor, publicId: string) {
  if (!/^review_[0-9a-f]{32}$/.test(publicId)) throw new AdminAccessError(400, 'Invalid review identifier');
  const body = await coreAdminRequest<unknown>(
    actor,
    `/internal/v1/admin/data-platform/reviews/${encodeURIComponent(publicId)}`,
    'data-platform:read',
  );
  const parsed = dataPlatformReviewDetailSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible review-detail contract');
  return parsed.data;
}

export async function getDataPlatformOrganizations(actor: AdminActor, rawInput: Record<string, string | undefined>) {
  const input = dataPlatformOrganizationListQuerySchema.parse(rawInput);
  const url = coreUrl('/internal/v1/admin/data-platform/organizations');
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const body = await coreAdminRequest<unknown>(actor, `${url.pathname}${url.search}`, 'data-platform:read');
  const parsed = dataPlatformOrganizationListSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible organization-list contract');
  return parsed.data;
}

export async function getDataPlatformOrganization(actor: AdminActor, publicId: string) {
  if (!/^org_[0-9a-f]{32}$/.test(publicId)) throw new AdminAccessError(400, 'Invalid organization identifier');
  const body = await coreAdminRequest<unknown>(
    actor,
    `/internal/v1/admin/data-platform/organizations/${encodeURIComponent(publicId)}`,
    'data-platform:read',
  );
  const parsed = dataPlatformOrganizationDetailSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible organization-detail contract');
  return parsed.data;
}

export async function getDataPlatformSources(actor: AdminActor, rawInput: Record<string, string | undefined>) {
  const input = dataPlatformSourceListQuerySchema.parse(rawInput);
  const url = coreUrl('/internal/v1/admin/data-platform/sources');
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const body = await coreAdminRequest<unknown>(actor, `${url.pathname}${url.search}`, 'data-platform:read');
  const parsed = dataPlatformSourceListSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible source-list contract');
  return parsed.data;
}

export async function getDataPlatformSource(actor: AdminActor, sourceKey: string) {
  if (!/^[a-z][a-z0-9_]{2,63}$/.test(sourceKey)) throw new AdminAccessError(400, 'Invalid source identifier');
  const body = await coreAdminRequest<unknown>(
    actor,
    `/internal/v1/admin/data-platform/sources/${encodeURIComponent(sourceKey)}`,
    'data-platform:read',
  );
  const parsed = dataPlatformSourceDetailSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible source-detail contract');
  return parsed.data;
}

export async function getDataPlatformEvidenceGroups(actor: AdminActor, rawInput: Record<string, string | undefined>) {
  const input = evidenceGroupListQuerySchema.parse(rawInput);
  const url = coreUrl('/internal/v1/admin/data-platform/evidence-groups');
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const body = await coreAdminRequest<unknown>(actor, `${url.pathname}${url.search}`, 'data-platform:read');
  const parsed = evidenceGroupListSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible evidence-group contract');
  return parsed.data;
}

export async function getExternalEvidenceRequests(actor: AdminActor, rawInput: Record<string, string | undefined>) {
  const input = externalEvidenceListQuerySchema.parse(rawInput);
  const url = coreUrl('/internal/v1/admin/data-platform/external-evidence');
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const body = await coreAdminRequest<unknown>(actor, `${url.pathname}${url.search}`, 'data-platform:read');
  const parsed = externalEvidenceListSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible external-evidence contract');
  return parsed.data;
}

export async function submitExternalEvidenceRequest(actor: AdminActor, rawInput: ExternalEvidenceRequestInput) {
  const input = externalEvidenceRequestInputSchema.parse(rawInput);
  const requestId = crypto.randomUUID();
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.primaryRole,
    action: 'data_platform.external_evidence.requested',
    targetType: 'external_evidence_request',
    targetId: input.idempotencyKey,
    reason: input.reason,
    requestId,
    beforeState: null,
    afterState: null,
    metadata: { service: 'twiga-core', hostname: new URL(input.url).hostname },
  });
  const body = await coreAdminRequest<unknown>(
    actor,
    '/internal/v1/admin/data-platform/external-evidence',
    'data-platform:write',
    { method: 'POST', body: JSON.stringify(input) },
  );
  const parsed = externalEvidenceSubmitResultSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible external-evidence result');
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.primaryRole,
    action: parsed.data.created ? 'data_platform.external_evidence.queued' : 'data_platform.external_evidence.replayed',
    targetType: 'external_evidence_request',
    targetId: parsed.data.request.publicId,
    reason: input.reason,
    requestId,
    beforeState: null,
    afterState: { state: parsed.data.request.state, url: parsed.data.request.url },
    metadata: { service: 'twiga-core' },
  });
  return { ok: true, requestId, result: parsed.data };
}

export async function getAcquisitionPolicies(actor: AdminActor) {
  const body = await coreAdminRequest<unknown>(
    actor,
    '/internal/v1/admin/data-platform/acquisition-policies',
    'data-platform:read',
  );
  const parsed = acquisitionPoliciesSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned incompatible acquisition settings');
  return parsed.data;
}

export async function updateAcquisitionSettings(actor: AdminActor, rawInput: AcquisitionSettingsUpdateInput) {
  const input = acquisitionSettingsUpdateSchema.parse(rawInput);
  const requestId = crypto.randomUUID();
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId, actorEmail: actor.email, actorRole: actor.primaryRole,
    action: 'data_platform.acquisition_settings.update.requested', targetType: 'acquisition_policy',
    targetId: `version:${input.expectedVersion}`, reason: input.reason, requestId,
    beforeState: { version: input.expectedVersion }, afterState: null, metadata: { service: 'twiga-core' },
  });
  const body = await coreAdminRequest<unknown>(
    actor,
    '/internal/v1/admin/data-platform/acquisition-policies/settings',
    'data-platform:write',
    { method: 'POST', body: JSON.stringify(input) },
  );
  const parsed = acquisitionSettingsUpdateResultSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible acquisition-settings result');
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId, actorEmail: actor.email, actorRole: actor.primaryRole,
    action: 'data_platform.acquisition_settings.updated', targetType: 'acquisition_policy',
    targetId: parsed.data.settings.publicId, reason: input.reason, requestId,
    beforeState: { version: input.expectedVersion }, afterState: { version: parsed.data.settings.version },
    metadata: { service: 'twiga-core' },
  });
  return { ok: true, requestId, result: parsed.data };
}

export async function upsertAcquisitionDomainPolicy(actor: AdminActor, rawInput: AcquisitionDomainPolicyInput) {
  const input = acquisitionDomainPolicyInputSchema.parse(rawInput);
  const requestId = crypto.randomUUID();
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId, actorEmail: actor.email, actorRole: actor.primaryRole,
    action: 'data_platform.acquisition_domain_policy.save.requested', targetType: 'acquisition_domain_policy',
    targetId: input.hostname, reason: input.reason, requestId,
    beforeState: { version: input.expectedVersion }, afterState: null,
    metadata: { service: 'twiga-core', hostname: input.hostname },
  });
  const body = await coreAdminRequest<unknown>(
    actor,
    '/internal/v1/admin/data-platform/acquisition-policies/domains',
    'data-platform:write',
    { method: 'POST', body: JSON.stringify(input) },
  );
  const parsed = acquisitionDomainPolicyResultSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible domain-policy result');
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId, actorEmail: actor.email, actorRole: actor.primaryRole,
    action: input.expectedVersion === null
      ? 'data_platform.acquisition_domain_policy.created'
      : 'data_platform.acquisition_domain_policy.updated',
    targetType: 'acquisition_domain_policy', targetId: parsed.data.domain.publicId,
    reason: input.reason, requestId, beforeState: { version: input.expectedVersion },
    afterState: { version: parsed.data.domain.version, hostname: parsed.data.domain.hostname },
    metadata: { service: 'twiga-core' },
  });
  return { ok: true, requestId, result: parsed.data };
}

export async function getDataPlatformEvidenceGroup(actor: AdminActor, publicId: string) {
  if (!/^evidence_group_[0-9a-f]{32}$/.test(publicId)) throw new AdminAccessError(400, 'Invalid evidence group identifier');
  const body = await coreAdminRequest<unknown>(
    actor,
    `/internal/v1/admin/data-platform/evidence-groups/${encodeURIComponent(publicId)}`,
    'data-platform:read',
  );
  const parsed = evidenceGroupDetailSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible evidence-group detail contract');
  return parsed.data;
}

export async function getResolutionEvaluationSets(actor: AdminActor) {
  const body = await coreAdminRequest<unknown>(actor, '/internal/v1/admin/data-platform/resolution-evaluation-sets', 'data-platform:read');
  const parsed = resolutionEvaluationSetListSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible evaluation-set contract');
  return parsed.data;
}

export async function getResolutionEvaluationSet(actor: AdminActor, publicId: string) {
  if (!/^resolution_set_[0-9a-f]{32}$/.test(publicId)) throw new AdminAccessError(400, 'Invalid evaluation-set identifier');
  const body = await coreAdminRequest<unknown>(
    actor,
    `/internal/v1/admin/data-platform/resolution-evaluation-sets/${encodeURIComponent(publicId)}`,
    'data-platform:read',
  );
  const parsed = resolutionEvaluationSetDetailSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible evaluation-set detail contract');
  return parsed.data;
}

export async function reviewResolutionEvaluationLabel(
  actor: AdminActor,
  labelPublicId: string,
  rawInput: ResolutionLabelReviewInput,
) {
  if (!/^resolution_label_[0-9a-f]{32}$/.test(labelPublicId)) throw new AdminAccessError(400, 'Invalid evaluation-label identifier');
  const input = resolutionLabelReviewInputSchema.parse(rawInput);
  const requestId = crypto.randomUUID();
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.primaryRole,
    action: `data_platform.resolution_label.${input.decision}.requested`,
    targetType: 'resolution_evaluation_label',
    targetId: labelPublicId,
    reason: input.reason,
    requestId,
    beforeState: { latestReviewPublicId: input.expectedLatestReviewPublicId },
    afterState: null,
    metadata: { service: 'twiga-core', evidenceReferenceCount: input.evidenceReferences.length },
  });
  const body = await coreAdminRequest<unknown>(
    actor,
    `/internal/v1/admin/data-platform/resolution-evaluation-labels/${encodeURIComponent(labelPublicId)}/review`,
    'reviews:write',
    { method: 'POST', body: JSON.stringify(input) },
  );
  const parsed = resolutionLabelReviewResultSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible label-review contract');
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.primaryRole,
    action: `data_platform.resolution_label.${input.decision}`,
    targetType: 'resolution_evaluation_label',
    targetId: labelPublicId,
    reason: input.reason,
    requestId,
    beforeState: { latestReviewPublicId: input.expectedLatestReviewPublicId },
    afterState: {
      latestReviewPublicId: parsed.data.latestReview.publicId,
      decision: parsed.data.latestReview.decision,
      effectiveRecommendation: parsed.data.latestReview.effectiveRecommendation,
      progress: parsed.data.progress,
    },
    metadata: { service: 'twiga-core', evidenceReferenceCount: input.evidenceReferences.length },
  });
  return { ok: true, requestId, result: parsed.data };
}

export async function confirmResolutionEvaluationSet(
  actor: AdminActor,
  setPublicId: string,
  rawInput: ResolutionEvaluationSetConfirmationInput,
) {
  if (!/^resolution_set_[0-9a-f]{32}$/.test(setPublicId)) throw new AdminAccessError(400, 'Invalid evaluation-set identifier');
  const input = resolutionEvaluationSetConfirmationInputSchema.parse(rawInput);
  const requestId = crypto.randomUUID();
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.primaryRole,
    action: 'data_platform.resolution_evaluation_set.confirm.requested',
    targetType: 'resolution_evaluation_set',
    targetId: setPublicId,
    reason: input.reason,
    requestId,
    beforeState: { status: 'provisional', reviewVersion: input.expectedReviewVersion },
    afterState: null,
    metadata: { service: 'twiga-core' },
  });
  const body = await coreAdminRequest<unknown>(
    actor,
    `/internal/v1/admin/data-platform/resolution-evaluation-sets/${encodeURIComponent(setPublicId)}/confirm`,
    'reviews:write',
    { method: 'POST', body: JSON.stringify(input) },
  );
  const parsed = resolutionEvaluationSetConfirmationResultSchema.safeParse(body);
  if (!parsed.success) throw new AdminAccessError(502, 'Twiga Data Platform returned an incompatible evaluation-set confirmation contract');
  await maindb.insert(adminAuditLog).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.primaryRole,
    action: 'data_platform.resolution_evaluation_set.confirm',
    targetType: 'resolution_evaluation_set',
    targetId: setPublicId,
    reason: input.reason,
    requestId,
    beforeState: { status: 'provisional', reviewVersion: input.expectedReviewVersion },
    afterState: {
      status: parsed.data.evaluationSet.status,
      confirmedAt: parsed.data.evaluationSet.confirmedAt,
      acceptedCount: parsed.data.progress.acceptedCount,
      rejectedCount: parsed.data.progress.rejectedCount,
      latestScorePublicId: parsed.data.latestScore?.publicId ?? null,
    },
    metadata: { service: 'twiga-core' },
  });
  return { ok: true, requestId, result: parsed.data };
}

export async function resolveDataPlatformEntityReview(
  actor: AdminActor,
  reviewPublicId: string,
  input: { action: 'create_new' | 'link_existing' | 'dismiss'; organizationPublicId?: string; reason: string; expectedUpdatedAt?: string },
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
        expectedUpdatedAt: input.expectedUpdatedAt,
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
