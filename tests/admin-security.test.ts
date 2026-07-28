import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { canManageAccount, isAllowlistedAdminEmail, roleHasPermission, serviceSecretIsValid } from '@/lib/admin/security-primitives';

const originalAllowlist = process.env.ADMIN_EMAIL_ALLOWLIST;
const originalSecret = process.env.TWIGA_ADMIN_SERVICE_SECRET;

describe('admin security primitives', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL_ALLOWLIST = 'owner@twiga.ai, reviewer@twiga.ai';
    process.env.TWIGA_ADMIN_SERVICE_SECRET = 'a-secure-admin-service-secret-with-32-characters';
  });
  afterEach(() => {
    process.env.ADMIN_EMAIL_ALLOWLIST = originalAllowlist;
    process.env.TWIGA_ADMIN_SERVICE_SECRET = originalSecret;
  });

  test('normalizes the explicit allowlist', () => {
    expect(isAllowlistedAdminEmail(' Owner@Twiga.AI ')).toBe(true);
    expect(isAllowlistedAdminEmail('unknown@twiga.ai')).toBe(false);
  });

  test('requires the configured service assertion', () => {
    expect(serviceSecretIsValid('a-secure-admin-service-secret-with-32-characters')).toBe(true);
    expect(serviceSecretIsValid('wrong-secret')).toBe(false);
    expect(serviceSecretIsValid(null)).toBe(false);
  });

  test('enforces least privilege by role', () => {
    expect(roleHasPermission('super_admin', 'audit:read')).toBe(true);
    expect(roleHasPermission('support', 'sessions:revoke')).toBe(true);
    expect(roleHasPermission('quality_reviewer', 'feedback:write')).toBe(true);
    expect(roleHasPermission('quality_reviewer', 'data-platform:write')).toBe(true);
    expect(roleHasPermission('quality_reviewer', 'users:suspend')).toBe(false);
    expect(roleHasPermission('ai_operations', 'system:read')).toBe(true);
    expect(roleHasPermission('ai_operations', 'data-platform:read')).toBe(true);
    expect(roleHasPermission('ai_operations', 'data-platform:write')).toBe(false);
    expect(roleHasPermission('support', 'data-platform:read')).toBe(false);
    expect(roleHasPermission('ai_operations', 'users:read')).toBe(false);
    expect(roleHasPermission('user', 'overview:read')).toBe(false);
  });

  test('prevents non-super administrators from managing administrator accounts', () => {
    expect(canManageAccount(['support'], 'user')).toBe(true);
    expect(canManageAccount(['support'], 'quality_reviewer')).toBe(false);
    expect(canManageAccount(['quality_reviewer'], 'support')).toBe(false);
    expect(canManageAccount(['super_admin'], 'support')).toBe(true);
  });
});
