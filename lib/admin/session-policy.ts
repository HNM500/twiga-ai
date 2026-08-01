export const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export function isAdminSessionFresh(session: { createdAt: Date | string }, now = Date.now()) {
  const createdAt = new Date(session.createdAt).getTime();
  return Number.isFinite(createdAt) && now - createdAt <= ADMIN_SESSION_MAX_AGE_MS;
}
