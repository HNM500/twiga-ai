import { z } from 'zod';

const actionSchema = z.object({ label: z.string(), href: z.string().startsWith('/data-platform') });
const stageKeySchema = z.enum(['capture', 'extract', 'normalise', 'resolve', 'enrich', 'review', 'ready', 'publish']);
const operationalStatusSchema = z.enum(['queued', 'active', 'slow', 'stalled', 'completed', 'completed_with_errors', 'failed', 'cancelled']);
const runSchema = z.object({
  publicId: z.string(), sourceKey: z.string(), sourceName: z.string(), connectorKey: z.string(),
  parserVersion: z.string().optional(), triggerKind: z.string(), state: z.string(), itemsSeen: z.number(), itemsAccepted: z.number(),
  itemsSkipped: z.number(), itemsFailed: z.number(), startedAt: z.string().nullable(),
  itemsRetrying: z.number().optional(), itemsReviewRouted: z.number().optional(), stage: stageKeySchema.optional(),
  operationalStatus: operationalStatusSchema.optional(), completedAt: z.string().nullable(),
  createdAt: z.string().nullable(), lastActivityAt: z.string().nullable(),
});

export const dataPlatformRunListQuerySchema = z.object({
  state: z.enum(['queued', 'running', 'completed', 'completed_with_errors', 'failed', 'cancelled']).optional(),
  sourceKey: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9._:-]*$/i).optional(),
  connectorKey: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9._:-]*$/i).optional(),
  createdFrom: z.iso.datetime({ offset: true }).optional(),
  createdTo: z.iso.datetime({ offset: true }).optional(),
  cursor: z.string().trim().min(1).max(1_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['createdAt:desc', 'startedAt:desc', 'state:asc']).default('createdAt:desc'),
}).strict().refine((value) => !value.createdFrom || !value.createdTo || value.createdFrom <= value.createdTo, {
  path: ['createdTo'], message: 'createdFrom must be before or equal to createdTo',
});

export const dataPlatformOverviewSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'),
  generatedAt: z.string(),
  health: z.object({
    state: z.enum(['healthy', 'processing', 'needs_attention', 'blocked']),
    label: z.string(), summary: z.string(), reasonCodes: z.array(z.string()), lastActivityAt: z.string().nullable(),
  }),
  windows: z.object({
    snapshot: z.object({ kind: z.literal('snapshot'), label: z.string(), from: z.null(), to: z.string() }),
    recent: z.object({ kind: z.literal('rolling'), label: z.string(), from: z.string(), to: z.string() }),
  }),
  trends: z.object({ available: z.boolean(), reason: z.string() }),
  metrics: z.object({
    organizations: z.number(), publishedOrganizations: z.number(), publishableOrganizations: z.number(),
    sources: z.number(), operationalSources: z.number(), blockedSources: z.number(), observations: z.number(),
    openReviews: z.number(), actionableEntityMatchReviews: z.number(), urgentReviews: z.number(), ingestionRuns: z.number(), activeRuns: z.number(),
    failedRuns24h: z.number(), failedItems: z.number(), retryingItems: z.number(),
  }),
  currentRun: runSchema.extend({ isActive: z.boolean(), lastActivityAt: z.string().nullable() }).nullable(),
  attentionItems: z.array(z.object({
    key: z.string(), severity: z.enum(['info', 'warning', 'critical']), count: z.number(),
    title: z.string(), description: z.string(), readAction: actionSchema, writeAction: actionSchema.optional(),
  })),
  readiness: z.array(z.object({
    key: stageKeySchema,
    label: z.string(), meaning: z.string(), value: z.number().nullable(), note: z.string(),
  })),
  recentActivity: z.array(z.object({
    id: z.string(), kind: z.literal('ingestion_run'), severity: z.enum(['info', 'warning']),
    title: z.string(), description: z.string(), occurredAt: z.string().nullable(), href: z.string(),
  })),
  recentRuns: z.array(runSchema),
  sources: z.array(z.object({
    sourceKey: z.string(), name: z.string(), sourceType: z.string(), authorityLevel: z.string(),
    rightsReviewStatus: z.string(), productionIngestionStatus: z.string(), defaultUsageClass: z.string(),
    observationCount: z.number(), lastObservedAt: z.string().nullable(),
  })),
  reviewBreakdown: z.array(z.object({ caseType: z.string(), state: z.string(), count: z.number() })),
});

export const dataPlatformRunListSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'),
  generatedAt: z.string(),
  runs: z.array(runSchema.extend({
    parserVersion: z.string(), itemsRetrying: z.number(), itemsReviewRouted: z.number(),
    stage: stageKeySchema, operationalStatus: operationalStatusSchema,
  })),
  count: z.number(), total: z.number(), hasMore: z.boolean(), nextCursor: z.string().nullable(),
  sort: z.enum(['createdAt:desc', 'startedAt:desc', 'state:asc']),
  filters: z.object({
    state: z.string().nullable(), sourceKey: z.string().nullable(), connectorKey: z.string().nullable(),
    createdFrom: z.string().nullable(), createdTo: z.string().nullable(),
  }),
});

export const dataPlatformRunDetailSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'),
  generatedAt: z.string(),
  run: runSchema.extend({
    parserVersion: z.string(), itemsRetrying: z.number(), itemsReviewRouted: z.number(),
    stage: stageKeySchema, operationalStatus: operationalStatusSchema,
    processingProfile: z.string(), legacySectorPack: z.string(), configuration: z.unknown(),
  }),
  stageProgress: z.array(z.object({
    key: stageKeySchema, label: z.string(), meaning: z.string(),
    status: z.enum(['waiting', 'in_progress', 'completed', 'completed_with_errors', 'blocked', 'failed', 'cancelled', 'not_instrumented']),
    processed: z.number().nullable(), failed: z.number(), note: z.string(),
  })).length(8),
  counters: z.object({
    seen: z.number(), accepted: z.number(), skipped: z.number(), retrying: z.number(),
    reviewRouted: z.number(), failed: z.number(),
    byItemState: z.array(z.object({ state: z.string(), count: z.number() })),
  }),
  throughput: z.object({ durationSeconds: z.number().nullable(), itemsPerMinute: z.number().nullable(), basis: z.string() }),
  estimatedCompletion: z.object({ at: z.string().nullable(), reason: z.string() }),
  eventTimeline: z.array(z.object({
    id: z.string(), kind: z.enum(['stage', 'ingestion']), stageKey: stageKeySchema,
    eventKind: z.string(), summary: z.string(), detail: z.unknown(), occurredAt: z.string(),
  })).max(100),
  eventCounts: z.array(z.object({ eventKind: z.string(), count: z.number() })),
  errorSummary: z.unknown(),
  errorCategories: z.array(z.object({ code: z.string(), count: z.number(), latestAt: z.string() })).max(12),
  boundedItemSample: z.array(z.object({
    sourceRecordId: z.string().nullable(), state: z.string(), errorCode: z.string().nullable(),
    attemptCount: z.number(), nextAttemptAt: z.string().nullable(), updatedAt: z.string(),
  })).max(20),
  checkpointBefore: z.unknown(), checkpointAfter: z.unknown(),
  estimatedCost: z.object({ minor: z.number(), currency: z.string() }),
  objectEvidenceStatus: z.object({ storedObjects: z.number(), observations: z.number() }),
  availableActions: z.object({
    retry: z.object({ available: z.literal(false), reason: z.string() }),
    cancel: z.object({ available: z.literal(false), reason: z.string() }),
    resume: z.object({ available: z.literal(false), reason: z.string() }),
  }),
  remediationLinks: z.object({ workQueue: z.string().nullable(), source: z.string() }),
});

export type DataPlatformOverview = z.infer<typeof dataPlatformOverviewSchema>;
export type DataPlatformRunList = z.infer<typeof dataPlatformRunListSchema>;
export type DataPlatformRunDetail = z.infer<typeof dataPlatformRunDetailSchema>;
