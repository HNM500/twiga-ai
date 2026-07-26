import 'server-only';

type EventFields = Record<string, boolean | number | string | null | undefined>;

function releaseContext() {
  return {
    service: 'twiga-web',
    environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'unknown',
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || null,
    release: process.env.SOURCE_REVISION || process.env.RAILWAY_GIT_COMMIT_SHA || null,
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message.slice(0, 500),
    };
  }

  return {
    errorName: 'UnknownError',
    errorMessage: String(error).slice(0, 500),
  };
}

export function logOperationalEvent(event: string, fields: EventFields = {}) {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event,
      ...releaseContext(),
      ...fields,
    }),
  );
}

export function logOperationalError(event: string, error: unknown, fields: EventFields = {}) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event,
      ...releaseContext(),
      ...fields,
      ...serializeError(error),
    }),
  );
}

export function getOpenRouterCostUsd(steps: ReadonlyArray<{ providerMetadata?: unknown }> | undefined): number | null {
  if (!steps) return null;

  let total = 0;
  let foundCost = false;

  for (const step of steps) {
    const metadata = step.providerMetadata;
    if (!metadata || typeof metadata !== 'object') continue;

    const openrouter = (metadata as Record<string, unknown>).openrouter;
    if (!openrouter || typeof openrouter !== 'object') continue;

    const usage = (openrouter as Record<string, unknown>).usage;
    if (!usage || typeof usage !== 'object') continue;

    const cost = (usage as Record<string, unknown>).cost;
    if (typeof cost === 'number' && Number.isFinite(cost)) {
      total += cost;
      foundCost = true;
    }
  }

  return foundCost ? Number(total.toFixed(8)) : null;
}
