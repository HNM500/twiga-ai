import { eq } from 'drizzle-orm';
import { ADMIN_ROLES, type AdminRole } from '@/lib/admin/permissions';

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3]?.trim() as AdminRole | undefined;

if (!email || !role || !ADMIN_ROLES.includes(role)) {
  console.error(`Usage: bun run admin:grant <existing-user-email> <${ADMIN_ROLES.join('|')}>`);
  process.exit(1);
}

const allowlist = new Set(
  (process.env.ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
if (!allowlist.has(email)) {
  console.error('Refusing to grant a role: add this email to ADMIN_EMAIL_ALLOWLIST first.');
  process.exit(1);
}

const [{ maindb }, { user }] = await Promise.all([import('@/lib/db'), import('@/lib/db/schema')]);

const updated = await maindb
  .update(user)
  .set({ role })
  .where(eq(user.email, email))
  .returning({ id: user.id, email: user.email, role: user.role });
if (!updated.length) {
  console.error(
    'No existing Twiga account matches that email. The staff member must create their Twiga account before a role can be granted.',
  );
  process.exit(1);
}

console.log(`Granted ${updated[0].role} to ${updated[0].email}.`);
process.exit(0);
