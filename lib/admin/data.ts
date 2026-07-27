import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';
import { maindb } from '@/lib/db';
import {
  adminAuditLog,
  adminFeedbackNote,
  adminFeedbackReview,
  answerFeedback,
  session,
  user,
} from '@/lib/db/schema';
import type { AdminActor } from '@/lib/admin/security';
import { invalidateSessionCacheForUser } from '@/lib/user-data-server';
import { getRedisClient } from '@/lib/redis';
import { getSanitizedSentryIssues } from '@/lib/admin/sentry';
import { canManageAccount } from '@/lib/admin/security-primitives';

function rows<T>(result: unknown): T[] {
  return (result as { rows?: T[] }).rows ?? (result as T[]);
}

function requestId() {
  return crypto.randomUUID();
}

function assertCanManageAccount(actor: AdminActor, targetRole: string | null | undefined) {
  if (!canManageAccount(actor.roles, targetRole)) {
    throw new Error('Only super administrators can manage administrator accounts');
  }
}

export async function getAdminOverview() {
  const result = await maindb.execute(sql`
    SELECT
      (SELECT count(*)::int FROM "user") AS "totalUsers",
      (SELECT count(*)::int FROM "user" WHERE created_at >= now() - interval '24 hours') AS "newUsers24h",
      (SELECT count(DISTINCT "userId")::int FROM chat WHERE updated_at >= now() - interval '24 hours') AS "activeUsers24h",
      (SELECT count(*)::int FROM chat WHERE created_at >= now() - interval '24 hours') AS "chats24h",
      (SELECT count(*)::int FROM message WHERE role = 'assistant' AND created_at >= now() - interval '24 hours') AS "answers24h",
      (SELECT count(*)::int FROM generation_telemetry WHERE created_at >= now() - interval '24 hours') AS "generations24h",
      (SELECT count(*)::int FROM generation_telemetry WHERE user_id IS NULL AND created_at >= now() - interval '24 hours') AS "guestGenerations24h",
      (SELECT COALESCE(sum(cost_usd), 0)::real FROM generation_telemetry WHERE created_at >= now() - interval '24 hours') AS "costUsd24h",
      (SELECT COALESCE(avg(duration_ms), 0)::int FROM generation_telemetry WHERE created_at >= now() - interval '24 hours') AS "avgLatencyMs24h",
      (SELECT COALESCE(100.0 * count(*) FILTER (WHERE status = 'failed') / NULLIF(count(*), 0), 0)::real FROM generation_telemetry WHERE created_at >= now() - interval '24 hours') AS "errorRate24h",
      (SELECT count(*)::int FROM answer_feedback af LEFT JOIN admin_feedback_review ar ON ar.feedback_id = af.id WHERE COALESCE(ar.status, 'open') <> 'resolved') AS "openFeedback"
  `);
  const metrics = rows<Record<string, number>>(result)[0];
  const routeResult = await maindb.execute(sql`
    SELECT route, count(*)::int AS count
    FROM generation_telemetry
    WHERE created_at >= now() - interval '7 days'
    GROUP BY route
    ORDER BY count(*) DESC
  `);
  return {
    metrics,
    routes: rows<{ route: string; count: number }>(routeResult),
    release: process.env.SOURCE_REVISION || process.env.RAILWAY_GIT_COMMIT_SHA || 'local',
    environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'unknown',
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminUsers(input: { query?: string; status?: string; page?: number }) {
  const page = Math.max(1, input.page || 1);
  const limit = 30;
  const offset = (page - 1) * limit;
  const query = input.query?.trim() || '';
  const searchFilter = query ? sql`AND (u.email ILIKE ${`%${query}%`} OR u.name ILIKE ${`%${query}%`} OR u.id = ${query})` : sql``;
  const statusFilter = input.status === 'suspended' ? sql`AND u.banned = true` : input.status === 'active' ? sql`AND u.banned = false` : sql``;
  const result = await maindb.execute(sql`
    SELECT
      u.id, u.name, u.email, u.email_verified AS "emailVerified", u.image,
      u.role, u.banned, u.ban_reason AS "banReason", u.ban_expires AS "banExpires",
      u.created_at AS "createdAt", u.updated_at AS "updatedAt",
      (SELECT max(s.updated_at) FROM session s WHERE s.user_id = u.id) AS "lastAuthenticatedAt",
      (SELECT count(*)::int FROM session s WHERE s.user_id = u.id AND s.expires_at > now()) AS "activeSessionCount",
      (SELECT max(c.updated_at) FROM chat c WHERE c."userId" = u.id) AS "lastActivityAt",
      (SELECT count(*)::int FROM chat c WHERE c."userId" = u.id) AS "chatCount",
      (SELECT count(*)::int FROM message m JOIN chat c ON c.id = m.chat_id WHERE c."userId" = u.id AND m.role = 'user') AS "questionCount"
    FROM "user" u
    WHERE true ${searchFilter} ${statusFilter}
    ORDER BY u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  const countResult = await maindb.execute(sql`
    SELECT count(*)::int AS count FROM "user" u WHERE true ${searchFilter} ${statusFilter}
  `);
  return { users: rows(result), page, pageSize: limit, total: rows<{ count: number }>(countResult)[0]?.count || 0 };
}

export async function getAdminUser(userId: string) {
  const userResult = await maindb.execute(sql`
    SELECT u.id, u.name, u.email, u.email_verified AS "emailVerified", u.role, u.banned,
      u.ban_reason AS "banReason", u.ban_expires AS "banExpires", u.created_at AS "createdAt",
      (SELECT count(*)::int FROM chat c WHERE c."userId" = u.id) AS "chatCount",
      (SELECT count(*)::int FROM message m JOIN chat c ON c.id = m.chat_id WHERE c."userId" = u.id AND m.role = 'user') AS "questionCount",
      (SELECT COALESCE(sum(cost_usd), 0)::real FROM generation_telemetry gt WHERE gt.user_id = u.id) AS "costUsd"
    FROM "user" u WHERE u.id = ${userId}
  `);
  const sessionResult = await maindb.execute(sql`
    SELECT id, created_at AS "createdAt", updated_at AS "lastSeenAt", expires_at AS "expiresAt",
      CASE
        WHEN user_agent ILIKE '%Mobile%' THEN 'Mobile browser'
        WHEN user_agent IS NULL THEN 'Unknown device'
        ELSE 'Desktop browser'
      END AS device
    FROM session WHERE user_id = ${userId} AND expires_at > now()
    ORDER BY updated_at DESC
  `);
  return { user: rows(userResult)[0] ?? null, sessions: rows(sessionResult) };
}

export async function getAdminFeedback(input: { status?: string; kind?: string; page?: number }) {
  const page = Math.max(1, input.page || 1);
  const limit = 30;
  const offset = (page - 1) * limit;
  const statusFilter = input.status ? sql`AND COALESCE(ar.status, 'open') = ${input.status}` : sql``;
  const kindFilter = input.kind ? sql`AND af.kind = ${input.kind}` : sql``;
  const result = await maindb.execute(sql`
    SELECT af.id, af.message_id AS "messageId", af.chat_id AS "chatId", af.kind, af.reasons, af.comment,
      af.requested_search_mode AS "requestedSearchMode", af.resolved_search_mode AS "resolvedSearchMode",
      af.created_at AS "createdAt", u.email AS "submittedBy", m.model,
      COALESCE(ar.status, 'open') AS status, ar.assigned_to_user_id AS "assignedToUserId",
      assigned.email AS "assignedToEmail", ar.resolution, ar.resolved_at AS "resolvedAt",
      (SELECT count(*)::int FROM admin_feedback_note n WHERE n.feedback_id = af.id) AS "noteCount"
    FROM answer_feedback af
    LEFT JOIN admin_feedback_review ar ON ar.feedback_id = af.id
    LEFT JOIN "user" u ON u.id = af.user_id
    LEFT JOIN message m ON m.id = af.message_id
    LEFT JOIN "user" assigned ON assigned.id = ar.assigned_to_user_id
    WHERE true ${statusFilter} ${kindFilter}
    ORDER BY af.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  const countResult = await maindb.execute(sql`
    SELECT count(*)::int AS count
    FROM answer_feedback af LEFT JOIN admin_feedback_review ar ON ar.feedback_id = af.id
    WHERE true ${statusFilter} ${kindFilter}
  `);
  return { feedback: rows(result), page, pageSize: limit, total: rows<{ count: number }>(countResult)[0]?.count || 0 };
}

export async function getAdminFeedbackItem(feedbackId: string) {
  const result = await maindb.execute(sql`
    SELECT af.id, af.message_id AS "messageId", af.chat_id AS "chatId", af.kind, af.reasons, af.comment,
      af.requested_search_mode AS "requestedSearchMode", af.resolved_search_mode AS "resolvedSearchMode",
      af.created_at AS "createdAt", u.email AS "submittedBy", m.model,
      COALESCE(ar.status, 'open') AS status, ar.assigned_to_user_id AS "assignedToUserId",
      assigned.email AS "assignedToEmail", ar.resolution, ar.resolved_at AS "resolvedAt"
    FROM answer_feedback af
    LEFT JOIN admin_feedback_review ar ON ar.feedback_id = af.id
    LEFT JOIN "user" u ON u.id = af.user_id
    LEFT JOIN message m ON m.id = af.message_id
    LEFT JOIN "user" assigned ON assigned.id = ar.assigned_to_user_id
    WHERE af.id = ${feedbackId}
  `);
  const notes = await maindb.execute(sql`
    SELECT id, author_email AS "authorEmail", body, created_at AS "createdAt"
    FROM admin_feedback_note WHERE feedback_id = ${feedbackId} ORDER BY created_at ASC
  `);
  return { feedback: rows(result)[0] ?? null, notes: rows(notes) };
}

export async function getAdminOperations() {
  const summary = await maindb.execute(sql`
    SELECT count(*)::int AS requests,
      count(*) FILTER (WHERE status = 'failed')::int AS failures,
      COALESCE(avg(duration_ms), 0)::int AS "avgLatencyMs",
      COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)::int AS "p95LatencyMs",
      COALESCE(sum(total_tokens), 0)::bigint AS "totalTokens",
      COALESCE(sum(cost_usd), 0)::real AS "costUsd"
    FROM generation_telemetry WHERE created_at >= now() - interval '7 days'
  `);
  const byRoute = await maindb.execute(sql`
    SELECT route, count(*)::int AS requests,
      count(*) FILTER (WHERE status = 'failed')::int AS failures,
      COALESCE(avg(duration_ms), 0)::int AS "avgLatencyMs",
      COALESCE(sum(cost_usd), 0)::real AS "costUsd"
    FROM generation_telemetry WHERE created_at >= now() - interval '7 days'
    GROUP BY route ORDER BY requests DESC
  `);
  const byModel = await maindb.execute(sql`
    SELECT model, COALESCE(provider_model, model) AS "providerModel", count(*)::int AS requests,
      count(*) FILTER (WHERE status = 'failed')::int AS failures,
      COALESCE(avg(duration_ms), 0)::int AS "avgLatencyMs",
      COALESCE(sum(total_tokens), 0)::bigint AS "totalTokens",
      COALESCE(sum(cost_usd), 0)::real AS "costUsd"
    FROM generation_telemetry WHERE created_at >= now() - interval '7 days'
    GROUP BY model, provider_model ORDER BY requests DESC
  `);
  return {
    window: '7d',
    summary: rows(summary)[0],
    byRoute: rows(byRoute),
    byModel: rows(byModel),
    aliases: {
      default: process.env.OPENROUTER_DEFAULT_MODEL || null,
      search: process.env.OPENROUTER_SEARCH_MODEL || null,
      router: process.env.OPENROUTER_ROUTER_MODEL || null,
      reasoning: process.env.OPENROUTER_REASONING_MODEL || null,
    },
  };
}

export async function getAdminSystem() {
  const checkedAt = new Date().toISOString();
  let postgres = 'ok';
  let redis = process.env.REDIS_URL ? 'error' : 'not_configured';
  try {
    await maindb.execute(sql`SELECT 1`);
  } catch {
    postgres = 'error';
  }
  if (process.env.REDIS_URL) {
    try {
      const client = await getRedisClient();
      redis = client && (await client.ping()) === 'PONG' ? 'ok' : 'error';
    } catch {
      redis = 'error';
    }
  }
  const sentry = await getSanitizedSentryIssues().catch(() => ({ configured: true as const, available: false as const, issues: [] }));
  return {
    checkedAt,
    dependencies: { postgres, redis },
    release: process.env.SOURCE_REVISION || process.env.RAILWAY_GIT_COMMIT_SHA || 'local',
    environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'unknown',
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || null,
    sentry,
  };
}

export async function getAdminAudit(input: { page?: number; action?: string }) {
  const page = Math.max(1, input.page || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  const actionFilter = input.action ? eq(adminAuditLog.action, input.action) : undefined;
  const events = await maindb.select().from(adminAuditLog).where(actionFilter).orderBy(desc(adminAuditLog.createdAt)).limit(limit).offset(offset);
  const totalResult = await maindb.execute(sql`SELECT count(*)::int AS count FROM admin_audit_log ${input.action ? sql`WHERE action = ${input.action}` : sql``}`);
  return { events, page, pageSize: limit, total: rows<{ count: number }>(totalResult)[0]?.count || 0 };
}

export async function revokeAdminManagedSession(actor: AdminActor, userId: string, sessionId: string, reason: string) {
  const id = requestId();
  const result = await maindb.transaction(async (tx) => {
    const target = await tx.query.user.findFirst({ where: eq(user.id, userId) });
    if (!target) return false;
    assertCanManageAccount(actor, target.role);
    const existing = await tx.query.session.findFirst({ where: and(eq(session.id, sessionId), eq(session.userId, userId)) });
    if (!existing) return false;
    await tx.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, userId)));
    await tx.insert(adminAuditLog).values({
      actorUserId: actor.userId, actorEmail: actor.email, actorRole: actor.primaryRole,
      action: 'session.revoke', targetType: 'session', targetId: sessionId, reason, requestId: id,
      beforeState: { userId, createdAt: existing.createdAt, expiresAt: existing.expiresAt }, afterState: { revoked: true },
    });
    return true;
  });
  invalidateSessionCacheForUser(userId);
  return { ok: result, requestId: id };
}

export async function setAdminManagedUserStatus(actor: AdminActor, userId: string, status: 'active' | 'suspended', reason: string) {
  if (actor.userId === userId && status === 'suspended') throw new Error('Administrators cannot suspend their own account');
  const id = requestId();
  const result = await maindb.transaction(async (tx) => {
    const existing = await tx.query.user.findFirst({ where: eq(user.id, userId) });
    if (!existing) return false;
    assertCanManageAccount(actor, existing.role);
    const suspended = status === 'suspended';
    await tx.update(user).set({ banned: suspended, banReason: suspended ? reason : null, banExpires: null }).where(eq(user.id, userId));
    if (suspended) await tx.delete(session).where(eq(session.userId, userId));
    await tx.insert(adminAuditLog).values({
      actorUserId: actor.userId, actorEmail: actor.email, actorRole: actor.primaryRole,
      action: suspended ? 'user.suspend' : 'user.reactivate', targetType: 'user', targetId: userId, reason, requestId: id,
      beforeState: { banned: existing.banned, banReason: existing.banReason },
      afterState: { banned: suspended, banReason: suspended ? reason : null },
    });
    return true;
  });
  invalidateSessionCacheForUser(userId);
  return { ok: result, requestId: id };
}

export async function updateAdminFeedback(
  actor: AdminActor,
  feedbackId: string,
  input: { action: 'assign_to_me' | 'unassign' | 'resolve' | 'reopen' | 'note'; reason: string; note?: string; resolution?: string },
) {
  const id = requestId();
  return maindb.transaction(async (tx) => {
    const feedback = await tx.query.answerFeedback.findFirst({ where: eq(answerFeedback.id, feedbackId) });
    if (!feedback) return { ok: false, requestId: id };
    const before = await tx.query.adminFeedbackReview.findFirst({ where: eq(adminFeedbackReview.feedbackId, feedbackId) });
    if (input.action === 'note') {
      await tx.insert(adminFeedbackNote).values({ feedbackId, authorUserId: actor.userId, authorEmail: actor.email, body: input.note! });
    } else {
      const next = {
        feedbackId,
        status: input.action === 'resolve' ? 'resolved' as const : input.action === 'reopen' ? 'open' as const : before?.status || 'in_review' as const,
        assignedToUserId: input.action === 'assign_to_me' ? actor.userId : input.action === 'unassign' ? null : before?.assignedToUserId ?? null,
        resolution: input.action === 'resolve' ? input.resolution! : input.action === 'reopen' ? null : before?.resolution ?? null,
        resolvedAt: input.action === 'resolve' ? new Date() : input.action === 'reopen' ? null : before?.resolvedAt ?? null,
        updatedAt: new Date(),
      };
      await tx.insert(adminFeedbackReview).values(next).onConflictDoUpdate({ target: adminFeedbackReview.feedbackId, set: next });
    }
    await tx.insert(adminAuditLog).values({
      actorUserId: actor.userId, actorEmail: actor.email, actorRole: actor.primaryRole,
      action: `feedback.${input.action}`, targetType: 'answer_feedback', targetId: feedbackId,
      reason: input.reason, requestId: id, beforeState: before ?? null,
      afterState: { action: input.action, resolution: input.resolution || null },
    });
    return { ok: true, requestId: id };
  });
}
