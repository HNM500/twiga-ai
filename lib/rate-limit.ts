import { createClient, type RedisClientType } from 'redis';

const LIMIT = 25;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const localCounters = new Map<string, { count: number; reset: number }>();

let redisClient: RedisClientType | null = null;
let redisConnection: Promise<RedisClientType> | null = null;

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (redisClient?.isReady) return redisClient;

  if (!redisConnection) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (error) => console.error('Redis rate-limit error:', error));
    redisConnection = redisClient.connect().then(() => redisClient!);
  }

  return redisConnection;
}

async function limitWithLocalFallback(identifier: string) {
  const now = Date.now();
  const current = localCounters.get(identifier);
  const entry = !current || current.reset <= now ? { count: 0, reset: now + WINDOW_MS } : current;
  entry.count += 1;
  localCounters.set(identifier, entry);

  return {
    success: entry.count <= LIMIT,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - entry.count),
    reset: entry.reset,
  };
}

export const unauthenticatedRateLimit = {
  async limit(identifier: string) {
    const client = await getRedisClient();
    if (!client) return limitWithLocalFallback(identifier);

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

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp?.trim() || cfConnectingIp?.trim();
  return ip ? `ip:${ip}` : 'ip:unknown';
}
