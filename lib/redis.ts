import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let commandClient: RedisClient | null = null;
let commandConnection: Promise<RedisClient> | null = null;
let publisher: ReturnType<typeof createClient> | null = null;
let subscriber: ReturnType<typeof createClient> | null = null;

function createRedisClient(role: string, boundedReconnect = false) {
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: boundedReconnect
      ? {
          connectTimeout: 5_000,
          reconnectStrategy: (retries) => (retries >= 5 ? false : Math.min(100 * 2 ** retries, 1_000)),
        }
      : undefined,
  });
  client.on('error', (error) => console.error(`Redis ${role} error:`, error));
  return client;
}

/**
 * Shared command client for rate limits, MCP handoffs, and other short-lived
 * application state. Railway provides the Redis instance through REDIS_URL.
 */
export async function getRedisClient(): Promise<RedisClient | null> {
  if (!process.env.REDIS_URL) return null;

  if (!commandClient) commandClient = createRedisClient('command', true);
  if (commandClient.isReady || commandClient.isOpen) return commandClient;

  if (!commandConnection) {
    commandConnection = commandClient
      .connect()
      .then(() => commandClient!)
      .catch((error) => {
        commandConnection = null;
        commandClient = null;
        throw error;
      });
  }

  return commandConnection;
}

export function getResumableStreamClients() {
  if (!process.env.REDIS_URL) return null;

  if (!publisher) {
    publisher = createRedisClient('stream publisher');
  }
  if (!subscriber) {
    subscriber = createRedisClient('stream subscriber');
  }

  return { publisher, subscriber };
}
