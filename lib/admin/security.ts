import 'server-only';

import { auth } from '@/lib/auth';
import { parseAdminRoles, type AdminRole } from '@/lib/admin/permissions';
import {
  isAllowlistedAdminEmail,
  permissionsByRole,
  serviceSecretIsValid,
  type AdminPermission,
} from '@/lib/admin/security-primitives';
import { isAdminSessionFresh } from '@/lib/admin/session-policy';
export type { AdminPermission } from '@/lib/admin/security-primitives';

export interface AdminActor {
  userId: string;
  email: string;
  name: string;
  roles: AdminRole[];
  primaryRole: AdminRole;
  sessionId: string;
}

export class AdminAccessError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function authorizeAdminRequest(request: Request, permission: AdminPermission): Promise<AdminActor> {
  if (!serviceSecretIsValid(request.headers.get('x-twiga-admin-secret'))) {
    throw new AdminAccessError(401, 'Invalid admin service assertion');
  }

  const current = await auth.api.getSession({ headers: request.headers });
  if (!current?.user?.id || !current.session?.id) {
    throw new AdminAccessError(401, 'Administrator sign-in required');
  }

  const email = current.user.email?.trim().toLowerCase();
  if (!isAllowlistedAdminEmail(email)) {
    throw new AdminAccessError(403, 'This account is not on the administrator allowlist');
  }

  const userWithAdminFields = current.user as typeof current.user & { role?: string; banned?: boolean };
  if (userWithAdminFields.banned) {
    throw new AdminAccessError(403, 'This administrator account is suspended');
  }

  const roles = parseAdminRoles(userWithAdminFields.role);
  if (!roles.length || !roles.some((role) => permissionsByRole[role].includes(permission))) {
    throw new AdminAccessError(403, 'Your administrator role does not permit this action');
  }

  if (!isAdminSessionFresh(current.session)) {
    throw new AdminAccessError(401, 'Administrator session expired; sign in again');
  }

  return {
    userId: current.user.id,
    email,
    name: current.user.name,
    roles,
    primaryRole: roles[0],
    sessionId: current.session.id,
  };
}

export function hasAdminPermission(actor: AdminActor, permission: AdminPermission) {
  return actor.roles.some((role) => permissionsByRole[role].includes(permission));
}

export function adminAccessErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: 'Admin request failed' }, { status: 500 });
}
