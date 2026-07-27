import { describe, expect, test } from 'bun:test';

describe('administrator audit migration', () => {
  test('database prevents ordinary updates and deletes', async () => {
    const migration = await Bun.file(new URL('../drizzle/twiga-migrations/0003_same_thunderball.sql', import.meta.url)).text();
    expect(migration).toContain('admin_audit_log_append_only');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "admin_audit_log"');
    expect(migration).toContain("RAISE EXCEPTION 'admin_audit_log is append-only'");
  });
});
