import 'server-only';

import { getRedisClient } from '@/lib/redis';

const RESPONSE_KEY_PREFIX = 'twiga:mcp:elicitation:response:';
const PENDING_KEY_PREFIX = 'twiga:mcp:elicitation:pending:';
const RESPONSE_TTL_SECONDS = 10 * 60;
const PENDING_TTL_SECONDS = 6 * 60;

export type McpElicitationResult = {
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, unknown>;
};

function responseKey(elicitationId: string) {
  return `${RESPONSE_KEY_PREFIX}${elicitationId}`;
}

function pendingKey(elicitationId: string) {
  return `${PENDING_KEY_PREFIX}${elicitationId}`;
}

export async function markMcpElicitationPending(elicitationId: string) {
  const redis = await getRedisClient();
  if (!redis) return false;

  await redis.set(pendingKey(elicitationId), '1', { expiration: { type: 'EX', value: PENDING_TTL_SECONDS } });
  return true;
}

export async function hasPendingMcpElicitation(elicitationId: string) {
  const redis = await getRedisClient();
  if (!redis) return false;
  return (await redis.exists(pendingKey(elicitationId))) > 0;
}

export async function storeMcpElicitationResponse(elicitationId: string, result: McpElicitationResult) {
  const redis = await getRedisClient();
  if (!redis) return false;

  await redis.set(responseKey(elicitationId), JSON.stringify(result), {
    expiration: { type: 'EX', value: RESPONSE_TTL_SECONDS },
  });
  return true;
}

export async function consumeMcpElicitationResponse(elicitationId: string): Promise<McpElicitationResult | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  const serialized = await redis.getDel(responseKey(elicitationId));
  if (!serialized) return null;

  try {
    const result = JSON.parse(serialized) as McpElicitationResult;
    if (!['accept', 'decline', 'cancel'].includes(result.action)) return null;
    return result;
  } catch {
    return null;
  }
}

export async function clearPendingMcpElicitation(elicitationId: string) {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(pendingKey(elicitationId));
}

export async function clearMcpElicitation(elicitationId: string) {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del([pendingKey(elicitationId), responseKey(elicitationId)]);
}
