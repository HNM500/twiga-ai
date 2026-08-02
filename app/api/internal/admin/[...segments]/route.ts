import { z } from 'zod';
import {
  adminAccessErrorResponse,
  authorizeAdminRequest,
  hasAdminPermission,
  type AdminPermission,
} from '@/lib/admin/security';
import {
  getAdminAudit,
  getAdminFeedback,
  getAdminFeedbackItem,
  getAdminOperations,
  getAdminOverview,
  getAdminSystem,
  getAdminUser,
  getAdminUsers,
  revokeAdminManagedSession,
  setAdminManagedUserStatus,
  updateAdminFeedback,
} from '@/lib/admin/data';
import { logOperationalError, logOperationalEvent } from '@/lib/observability';
import {
  getDataPlatformOrganization,
  getDataPlatformOrganizations,
  getDataPlatformPerson,
  getDataPlatformReview,
  getDataPlatformReviews,
  getDataPlatformOverview,
  getDataPlatformRun,
  getDataPlatformRuns,
  getDataPlatformSource,
  getDataPlatformSources,
  getDataPlatformEvidenceGroup,
  getDataPlatformEvidenceGroups,
  getResolutionEvaluationSet,
  getResolutionEvaluationSets,
  confirmResolutionEvaluationSet,
  reviewResolutionEvaluationLabel,
  resolveDataPlatformEntityReview,
  getExternalEvidenceRequests,
  submitExternalEvidenceRequest,
  getAcquisitionPolicies,
  updateAcquisitionSettings,
  upsertAcquisitionDomainPolicy,
  updateDataPlatformOrganization,
} from '@/lib/admin/data-platform';
import {
  acquisitionDomainPolicyInputSchema,
  acquisitionSettingsUpdateSchema,
  externalEvidenceRequestInputSchema,
  resolutionEvaluationSetConfirmationInputSchema,
  resolutionLabelReviewInputSchema,
  organizationDossierUpdateSchema,
} from '@/lib/admin/data-platform-contract';

export const dynamic = 'force-dynamic';

const reasonSchema = z.string().trim().min(8).max(500);
const statusSchema = z.object({ status: z.enum(['active', 'suspended']), reason: reasonSchema });
const revokeSchema = z.object({ reason: reasonSchema });
const feedbackSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign_to_me'), reason: reasonSchema }),
  z.object({ action: z.literal('unassign'), reason: reasonSchema }),
  z.object({ action: z.literal('reopen'), reason: reasonSchema }),
  z.object({ action: z.literal('resolve'), reason: reasonSchema, resolution: z.string().trim().min(3).max(1000) }),
  z.object({ action: z.literal('note'), reason: reasonSchema, note: z.string().trim().min(1).max(2000) }),
]);
const entityReviewSchema = z.object({
  action: z.enum(['create_new', 'link_existing', 'dismiss']),
  organizationPublicId: z.string().regex(/^org_[0-9a-f]{32}$/).optional(),
  personPublicId: z.string().regex(/^person_[0-9a-f]{32}$/).optional(),
  reason: reasonSchema,
  expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
}).superRefine((value, context) => {
  const targetCount = Number(Boolean(value.organizationPublicId)) + Number(Boolean(value.personPublicId));
  if (value.action === 'link_existing' && targetCount !== 1) {
    context.addIssue({ code: 'custom', path: ['organizationPublicId'], message: 'Exactly one Organization or Person is required' });
  }
  if (value.action !== 'link_existing' && targetCount) {
    context.addIssue({ code: 'custom', path: ['organizationPublicId'], message: 'An entity target is only valid when linking' });
  }
});

function permissionForGet(segments: string[]): AdminPermission | null {
  switch (segments[0]) {
    case 'session':
    case 'overview': return 'overview:read';
    case 'users': return 'users:read';
    case 'feedback': return 'feedback:read';
    case 'operations': return 'operations:read';
    case 'system': return 'system:read';
    case 'audit': return 'audit:read';
    case 'data-platform': return 'data-platform:read';
    default: return null;
  }
}

function parsePage(value: string | null) {
  const parsed = Number.parseInt(value || '1', 10);
  return Number.isFinite(parsed) ? parsed : 1;
}

export async function GET(request: Request, context: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await context.params;
  const permission = permissionForGet(segments);
  if (!permission) return Response.json({ error: 'Not found' }, { status: 404 });
  try {
    const actor = await authorizeAdminRequest(request, permission);
    const url = new URL(request.url);
    switch (segments[0]) {
      case 'session':
        return Response.json({
          actor: { id: actor.userId, email: actor.email, name: actor.name, roles: actor.roles },
          permissions: {
            users: hasAdminPermission(actor, 'users:read'),
            feedback: hasAdminPermission(actor, 'feedback:read'),
            operations: hasAdminPermission(actor, 'operations:read'),
            system: hasAdminPermission(actor, 'system:read'),
            audit: hasAdminPermission(actor, 'audit:read'),
            dataPlatform: hasAdminPermission(actor, 'data-platform:read'),
            dataPlatformWrite: hasAdminPermission(actor, 'data-platform:write'),
          },
        });
      case 'overview': return Response.json(await getAdminOverview());
      case 'users':
        if (segments[1]) return Response.json(await getAdminUser(segments[1]));
        return Response.json(await getAdminUsers({
          query: url.searchParams.get('query') || undefined,
          status: url.searchParams.get('status') || undefined,
          page: parsePage(url.searchParams.get('page')),
        }));
      case 'feedback':
        if (segments[1]) return Response.json(await getAdminFeedbackItem(segments[1]));
        return Response.json(await getAdminFeedback({
          status: url.searchParams.get('status') || undefined,
          kind: url.searchParams.get('kind') || undefined,
          page: parsePage(url.searchParams.get('page')),
        }));
      case 'operations': return Response.json(await getAdminOperations());
      case 'system': return Response.json(await getAdminSystem());
      case 'audit': return Response.json(await getAdminAudit({
        action: url.searchParams.get('action') || undefined,
        page: parsePage(url.searchParams.get('page')),
      }));
      case 'data-platform':
        if (segments[1] === 'runs' && segments[2]) {
          return Response.json(await getDataPlatformRun(actor, segments[2]));
        }
        if (segments[1] === 'runs') {
          const allowedKeys = ['state', 'sourceKey', 'connectorKey', 'createdFrom', 'createdTo', 'cursor', 'limit', 'sort'] as const;
          const unknownKeys = [...url.searchParams.keys()].filter((key) => !allowedKeys.includes(key as typeof allowedKeys[number]));
          if (unknownKeys.length) return Response.json({ error: 'Unknown run-list filter' }, { status: 400 });
          return Response.json(await getDataPlatformRuns(actor, Object.fromEntries(
            allowedKeys.map((key) => [key, url.searchParams.get(key) ?? undefined]),
          )));
        }
        if (segments[1] === 'reviews') {
          if (segments[2]) return Response.json(await getDataPlatformReview(actor, segments[2]));
          const allowedKeys = ['caseType', 'sourceKey', 'reasonCode', 'priority', 'confidenceBand', 'age', 'state', 'assignee', 'cursor', 'limit', 'sort'] as const;
          const unknownKeys = [...url.searchParams.keys()].filter((key) => !allowedKeys.includes(key as typeof allowedKeys[number]));
          if (unknownKeys.length) return Response.json({ error: 'Unknown review-queue filter' }, { status: 400 });
          return Response.json(await getDataPlatformReviews(actor, Object.fromEntries(
            allowedKeys.map((key) => [key, url.searchParams.get(key) ?? undefined]),
          )));
        }
        if (segments[1] === 'organizations') {
          if (segments[2]) return Response.json(await getDataPlatformOrganization(actor, segments[2]));
          const allowedKeys = ['query', 'entityKind', 'operatingStatus', 'lifecycleState', 'category', 'region', 'readinessProduct', 'cursor', 'limit', 'sort'] as const;
          const unknownKeys = [...url.searchParams.keys()].filter((key) => !allowedKeys.includes(key as typeof allowedKeys[number]));
          if (unknownKeys.length) return Response.json({ error: 'Unknown organization-list filter' }, { status: 400 });
          return Response.json(await getDataPlatformOrganizations(actor, Object.fromEntries(
            allowedKeys.map((key) => [key, url.searchParams.get(key) ?? undefined]),
          )));
        }
        if (segments[1] === 'people' && segments[2] && !segments[3] && !url.search) {
          return Response.json(await getDataPlatformPerson(actor, segments[2]));
        }
        if (segments[1] === 'sources') {
          if (segments[2]) return Response.json(await getDataPlatformSource(actor, segments[2]));
          const allowedKeys = ['sourceType', 'authorityLevel', 'rightsReviewStatus', 'productionIngestionStatus', 'connectorState', 'cursor', 'limit', 'sort'] as const;
          const unknownKeys = [...url.searchParams.keys()].filter((key) => !allowedKeys.includes(key as typeof allowedKeys[number]));
          if (unknownKeys.length) return Response.json({ error: 'Unknown source-list filter' }, { status: 400 });
          return Response.json(await getDataPlatformSources(actor, Object.fromEntries(
            allowedKeys.map((key) => [key, url.searchParams.get(key) ?? undefined]),
          )));
        }
        if (segments[1] === 'external-evidence') {
          if (segments[2]) return Response.json({ error: 'Invalid external-evidence request' }, { status: 400 });
          const allowedKeys = ['state', 'limit'] as const;
          const unknownKeys = [...url.searchParams.keys()].filter((key) => !allowedKeys.includes(key as typeof allowedKeys[number]));
          if (unknownKeys.length) return Response.json({ error: 'Unknown external-evidence filter' }, { status: 400 });
          return Response.json(await getExternalEvidenceRequests(actor, Object.fromEntries(
            allowedKeys.map((key) => [key, url.searchParams.get(key) ?? undefined]),
          )));
        }
        if (segments[1] === 'acquisition-policies') {
          if (segments[2] || url.search) return Response.json({ error: 'Invalid acquisition-policy request' }, { status: 400 });
          return Response.json(await getAcquisitionPolicies(actor));
        }
        if (segments[1] === 'evidence-groups') {
          if (segments[2]) return Response.json(await getDataPlatformEvidenceGroup(actor, segments[2]));
          const allowedKeys = ['sourceKey', 'entityRole', 'localityPosture', 'query', 'limit'] as const;
          const unknownKeys = [...url.searchParams.keys()].filter((key) => !allowedKeys.includes(key as typeof allowedKeys[number]));
          if (unknownKeys.length) return Response.json({ error: 'Unknown evidence-group filter' }, { status: 400 });
          return Response.json(await getDataPlatformEvidenceGroups(actor, Object.fromEntries(
            allowedKeys.map((key) => [key, url.searchParams.get(key) ?? undefined]),
          )));
        }
        if (segments[1] === 'resolution-evaluation-sets') {
          if (segments[3] || url.search) return Response.json({ error: 'Invalid evaluation-set request' }, { status: 400 });
          if (segments[2]) return Response.json(await getResolutionEvaluationSet(actor, segments[2]));
          return Response.json(await getResolutionEvaluationSets(actor));
        }
        return Response.json(await getDataPlatformOverview(actor));
      default: return Response.json({ error: 'Not found' }, { status: 404 });
    }
  } catch (error) {
    if (!(error instanceof Error && 'status' in error)) logOperationalError('admin_read_failed', error, { resource: segments[0] });
    return adminAccessErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await context.params;
  try {
    if (segments[0] === 'data-platform' && segments[1] === 'organizations' && segments[2] && !segments[3]) {
      const actor = await authorizeAdminRequest(request, 'data-platform:write');
      const body = organizationDossierUpdateSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'Check the organization changes and try again' }, { status: 400 });
      const result = await updateDataPlatformOrganization(actor, segments[2], body.data);
      logOperationalEvent('admin_mutation_completed', { action: 'data_platform.organization.update', requestId: result.requestId });
      return Response.json(result);
    }
    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    logOperationalError('admin_mutation_failed', error, { resource: segments[0] });
    return adminAccessErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await context.params;
  try {
    if (segments[0] === 'users' && segments[1] && segments[2] === 'status') {
      const actor = await authorizeAdminRequest(request, 'users:suspend');
      const body = statusSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'A valid status and reason are required' }, { status: 400 });
      const result = await setAdminManagedUserStatus(actor, segments[1], body.data.status, body.data.reason);
      if (!result.ok) return Response.json({ error: 'User not found' }, { status: 404 });
      logOperationalEvent('admin_mutation_completed', { action: `user.${body.data.status}`, requestId: result.requestId });
      return Response.json(result);
    }
    if (segments[0] === 'users' && segments[1] && segments[2] === 'sessions' && segments[3] && segments[4] === 'revoke') {
      const actor = await authorizeAdminRequest(request, 'sessions:revoke');
      const body = revokeSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'A valid reason is required' }, { status: 400 });
      const result = await revokeAdminManagedSession(actor, segments[1], segments[3], body.data.reason);
      if (!result.ok) return Response.json({ error: 'Session not found' }, { status: 404 });
      logOperationalEvent('admin_mutation_completed', { action: 'session.revoke', requestId: result.requestId });
      return Response.json(result);
    }
    if (segments[0] === 'feedback' && segments[1] && segments[2] === 'review') {
      const actor = await authorizeAdminRequest(request, 'feedback:write');
      const body = feedbackSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'Invalid feedback action' }, { status: 400 });
      const result = await updateAdminFeedback(actor, segments[1], body.data);
      if (!result.ok) return Response.json({ error: 'Feedback not found' }, { status: 404 });
      logOperationalEvent('admin_mutation_completed', { action: `feedback.${body.data.action}`, requestId: result.requestId });
      return Response.json(result);
    }
    if (segments[0] === 'data-platform' && segments[1] === 'reviews' && segments[2] && segments[3] === 'resolve') {
      const actor = await authorizeAdminRequest(request, 'data-platform:write');
      const body = entityReviewSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'A valid resolution and audit reason are required' }, { status: 400 });
      const result = await resolveDataPlatformEntityReview(actor, segments[2], body.data);
      logOperationalEvent('admin_mutation_completed', { action: `data_platform.entity_match.${body.data.action}`, requestId: result.requestId });
      return Response.json(result);
    }
    if (segments[0] === 'data-platform' && segments[1] === 'external-evidence' && !segments[2]) {
      const actor = await authorizeAdminRequest(request, 'data-platform:write');
      const body = externalEvidenceRequestInputSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'A public URL and audit reason are required' }, { status: 400 });
      const result = await submitExternalEvidenceRequest(actor, body.data);
      logOperationalEvent('admin_mutation_completed', { action: 'data_platform.external_evidence.request', requestId: result.requestId });
      return Response.json(result);
    }
    if (segments[0] === 'data-platform' && segments[1] === 'acquisition-policies'
      && segments[2] === 'settings' && !segments[3]) {
      const actor = await authorizeAdminRequest(request, 'data-platform:write');
      const body = acquisitionSettingsUpdateSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'Valid acquisition settings and an audit reason are required' }, { status: 400 });
      const result = await updateAcquisitionSettings(actor, body.data);
      logOperationalEvent('admin_mutation_completed', { action: 'data_platform.acquisition_settings.update', requestId: result.requestId });
      return Response.json(result);
    }
    if (segments[0] === 'data-platform' && segments[1] === 'acquisition-policies'
      && segments[2] === 'domains' && !segments[3]) {
      const actor = await authorizeAdminRequest(request, 'data-platform:write');
      const body = acquisitionDomainPolicyInputSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'A valid domain policy and audit reason are required' }, { status: 400 });
      const result = await upsertAcquisitionDomainPolicy(actor, body.data);
      logOperationalEvent('admin_mutation_completed', { action: 'data_platform.acquisition_domain_policy.save', requestId: result.requestId });
      return Response.json(result);
    }
    if (segments[0] === 'data-platform' && segments[1] === 'resolution-evaluation-labels'
      && segments[2] && segments[3] === 'review' && !segments[4]) {
      const actor = await authorizeAdminRequest(request, 'data-platform:write');
      const body = resolutionLabelReviewInputSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'A valid label review, evidence and audit reason are required' }, { status: 400 });
      const result = await reviewResolutionEvaluationLabel(actor, segments[2], body.data);
      logOperationalEvent('admin_mutation_completed', { action: `data_platform.resolution_label.${body.data.decision}`, requestId: result.requestId });
      return Response.json(result);
    }
    if (segments[0] === 'data-platform' && segments[1] === 'resolution-evaluation-sets'
      && segments[2] && segments[3] === 'confirm' && !segments[4]) {
      const actor = await authorizeAdminRequest(request, 'data-platform:write');
      const body = resolutionEvaluationSetConfirmationInputSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return Response.json({ error: 'A current reviewed set and audit reason are required' }, { status: 400 });
      const result = await confirmResolutionEvaluationSet(actor, segments[2], body.data);
      logOperationalEvent('admin_mutation_completed', { action: 'data_platform.resolution_evaluation_set.confirm', requestId: result.requestId });
      return Response.json(result);
    }
    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    logOperationalError('admin_mutation_failed', error, { resource: segments[0] });
    if (error instanceof Error && error.message.includes('cannot suspend')) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Only super administrators')) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return adminAccessErrorResponse(error);
  }
}
