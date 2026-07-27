import { z } from 'zod';
import { getLightweightUser } from '@/app/actions';
import { maindb } from '@/lib/db';
import { answerFeedback } from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';
import { feedbackRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logOperationalError, logOperationalEvent } from '@/lib/observability';

const feedbackSchema = z.object({
  messageId: z.string().trim().min(1).max(160),
  chatId: z.string().trim().min(1).max(160).optional(),
  kind: z.enum(['helpful', 'unhelpful', 'report']),
  reasons: z
    .array(z.enum(['incorrect', 'outdated', 'citation', 'unsafe', 'irrelevant', 'other']))
    .max(6)
    .default([]),
  comment: z.string().trim().max(1000).optional(),
  requestedSearchMode: z.enum(['auto', 'web', 'chat', 'mcp', 'youtube']).optional(),
  resolvedSearchMode: z.enum(['web', 'chat', 'mcp', 'youtube']).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return new ChatSDKError('bad_request:api', 'Invalid feedback').toResponse();
    }

    if (parsed.data.kind === 'report' && parsed.data.reasons.length === 0) {
      return new ChatSDKError('bad_request:api', 'Choose a reason for the report').toResponse();
    }

    const currentUser = await getLightweightUser().catch(() => null);
    const identifier = currentUser?.userId ? `user:${currentUser.userId}` : getClientIdentifier(request);
    const rateLimit = await feedbackRateLimit.limit(identifier);
    if (!rateLimit.success) {
      return new ChatSDKError('rate_limit:api', 'Too many feedback submissions. Please try again tomorrow.').toResponse();
    }

    await maindb.insert(answerFeedback).values({
      messageId: parsed.data.messageId,
      chatId: parsed.data.chatId,
      userId: currentUser?.userId ?? null,
      kind: parsed.data.kind,
      reasons: parsed.data.reasons,
      comment: parsed.data.comment || null,
      requestedSearchMode: parsed.data.requestedSearchMode,
      resolvedSearchMode: parsed.data.resolvedSearchMode,
    });

    logOperationalEvent('answer_feedback_received', {
      kind: parsed.data.kind,
      authenticated: Boolean(currentUser),
      resolvedSearchMode: parsed.data.resolvedSearchMode,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    logOperationalError('answer_feedback_failed', error);
    return new ChatSDKError('bad_request:api', 'Unable to save feedback').toResponse();
  }
}
