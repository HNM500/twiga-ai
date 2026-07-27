import { ANONYMOUS_WEEKLY_MESSAGE_LIMIT } from '@/lib/constants';
import { getRedisClient } from '@/lib/redis';

const LIMIT = ANONYMOUS_WEEKLY_MESSAGE_LIMIT;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const localCounters = new Map<string, { count: number; reset: number }>();

async function limitWithLocalFallback(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = localCounters.get(identifier);
  const entry = !current || current.reset <= now ? { count: 0, reset: now + windowMs } : current;
  entry.count += 1;
  localCounters.set(identifier, entry);

  return {
    success: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.reset,
  };
}

export const unauthenticatedRateLimit = {
  async limit(identifier: string) {
    const client = await getRedisClient();
    if (!client) return limitWithLocalFallback(`unauth:${identifier}`, LIMIT, WINDOW_MS);

    const key = `twiga:ratelimit:unauth:${identifier}`;
    const result = (await client.eval(
      `local count = redis.call('INCR', KEYS[1])
       local ttl = redis.call('PTTL', KEYS[1])
       if ttl < 0 then
         redis.call('PEXPIRE', KEYS[1], ARGV[1])
         ttl = tonumber(ARGV[1])
       end
       return {count, ttl}`,
      { keys: [key], arguments: [String(WINDOW_MS)] },
    )) as [number, number];

    const [count, ttl] = result;
    return {
      success: count <= LIMIT,
      limit: LIMIT,
      remaining: Math.max(0, LIMIT - count),
      reset: Date.now() + ttl,
    };
  },
};

const FEEDBACK_LIMIT = 30;
const FEEDBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

export const feedbackRateLimit = {
  async limit(identifier: string) {
    const client = await getRedisClient();
    if (!client) {
      return limitWithLocalFallback(`feedback:${identifier}`, FEEDBACK_LIMIT, FEEDBACK_WINDOW_MS);
    }

    const key = `twiga:ratelimit:feedback:${identifier}`;
    const result = (await client.eval(
      `local count = redis.call('INCR', KEYS[1])
       local ttl = redis.call('PTTL', KEYS[1])
       if ttl < 0 then
         redis.call('PEXPIRE', KEYS[1], ARGV[1])
         ttl = tonumber(ARGV[1])
       end
       return {count, ttl}`,
      { keys: [key], arguments: [String(FEEDBACK_WINDOW_MS)] },
    )) as [number, number];

    const [count, ttl] = result;
    return {
      success: count <= FEEDBACK_LIMIT,
      limit: FEEDBACK_LIMIT,
      remaining: Math.max(0, FEEDBACK_LIMIT - count),
      reset: Date.now() + ttl,
    };
  },
};

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp?.trim() || cfConnectingIp?.trim();
  return ip ? `ip:${ip}` : 'ip:unknown';
}
