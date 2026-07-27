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

function permissionForGet(segments: string[]): AdminPermission | null {
  switch (segments[0]) {
    case 'session':
    case 'overview': return 'overview:read';
    case 'users': return 'users:read';
    case 'feedback': return 'feedback:read';
    case 'operations': return 'operations:read';
    case 'system': return 'system:read';
    case 'audit': return 'audit:read';
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
      default: return Response.json({ error: 'Not found' }, { status: 404 });
    }
  } catch (error) {
    if (!(error instanceof Error && 'status' in error)) logOperationalError('admin_read_failed', error, { resource: segments[0] });
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
