import { createHash, timingSafeEqual } from 'node:crypto';
import { parseAdminRoles, type AdminRole } from '@/lib/admin/permissions';

export type AdminPermission =
  | 'overview:read' | 'users:read' | 'users:suspend' | 'sessions:revoke'
  | 'feedback:read' | 'feedback:write' | 'operations:read' | 'system:read' | 'audit:read'
  | 'data-platform:read' | 'data-platform:write' | 'data-platform:policy-override';

export const permissionsByRole: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: ['overview:read', 'users:read', 'users:suspend', 'sessions:revoke', 'feedback:read', 'feedback:write', 'operations:read', 'system:read', 'audit:read', 'data-platform:read', 'data-platform:write', 'data-platform:policy-override'],
  support: ['overview:read', 'users:read', 'users:suspend', 'sessions:revoke', 'feedback:read', 'feedback:write'],
  quality_reviewer: ['overview:read', 'feedback:read', 'feedback:write', 'operations:read', 'data-platform:read', 'data-platform:write'],
  ai_operations: ['overview:read', 'operations:read', 'system:read', 'data-platform:read'],
};

function digest(value: string) { return createHash('sha256').update(value).digest(); }

export function serviceSecretIsValid(candidate: string | null) {
  const configured = process.env.TWIGA_ADMIN_SERVICE_SECRET?.trim();
  if (!configured || configured.length < 32 || !candidate) return false;
  return timingSafeEqual(digest(candidate), digest(configured));
}

export function allowlistedEmails() {
  return new Set((process.env.ADMIN_EMAIL_ALLOWLIST || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isAllowlistedAdminEmail(email: string | null | undefined) {
  return Boolean(email && allowlistedEmails().has(email.trim().toLowerCase()));
}

export function roleHasPermission(rawRole: string | null | undefined, permission: AdminPermission) {
  return parseAdminRoles(rawRole).some((role) => permissionsByRole[role].includes(permission));
}

export function canManageAccount(actorRoles: readonly AdminRole[], targetRawRole: string | null | undefined) {
  const targetIsAdministrator = parseAdminRoles(targetRawRole).length > 0;
  return !targetIsAdministrator || actorRoles.includes('super_admin');
}
