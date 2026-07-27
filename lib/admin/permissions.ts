import { createAccessControl } from 'better-auth/plugins/access';

const statements = {
  user: ['create', 'list', 'set-role', 'ban', 'impersonate', 'impersonate-admins', 'delete', 'set-password', 'get', 'update'],
  session: ['list', 'revoke', 'delete'],
} as const;

export const adminAccessControl = createAccessControl(statements);

export const authRoles = {
  user: adminAccessControl.newRole({ user: [], session: [] }),
  support: adminAccessControl.newRole({ user: [], session: [] }),
  quality_reviewer: adminAccessControl.newRole({ user: [], session: [] }),
  ai_operations: adminAccessControl.newRole({ user: [], session: [] }),
  super_admin: adminAccessControl.newRole({
    user: ['list', 'get', 'ban'],
    session: ['list', 'revoke'],
  }),
};

export type AdminRole = Exclude<keyof typeof authRoles, 'user'>;

export const ADMIN_ROLES = ['super_admin', 'support', 'quality_reviewer', 'ai_operations'] as const;

export function parseAdminRoles(rawRole: string | null | undefined): AdminRole[] {
  if (!rawRole) return [];
  return rawRole
    .split(',')
    .map((role) => role.trim())
    .filter((role): role is AdminRole => ADMIN_ROLES.includes(role as AdminRole));
}
