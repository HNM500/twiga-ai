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

const reviewStateSchema = z.enum(['open', 'assigned', 'resolved', 'dismissed']);
const reviewPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
const reviewCaseTypeSchema = z.enum(['rights', 'quality', 'entity_match', 'conflict', 'extraction', 'abuse']);
const reviewConfidenceBandSchema = z.enum(['unknown', 'low', 'medium', 'high', 'exact']);
const reviewRecommendationSchema = z.object({
  action: z.enum(['create_new', 'link_existing']).nullable(), candidatePublicId: z.string().nullable(),
  label: z.string(), rationale: z.string(),
});

export const dataPlatformReviewListQuerySchema = z.object({
  caseType: reviewCaseTypeSchema.optional(),
  sourceKey: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9._:-]*$/i).optional(),
  reasonCode: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9._:-]*$/i).optional(),
  priority: reviewPrioritySchema.optional(),
  confidenceBand: reviewConfidenceBandSchema.optional(),
  age: z.enum(['over24h', 'over7d', 'over30d']).optional(),
  state: reviewStateSchema.default('open'),
  assignee: z.enum(['assigned', 'unassigned']).optional(),
  cursor: z.string().trim().min(1).max(1_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['priority:desc', 'createdAt:asc', 'confidence:desc']).default('priority:desc'),
}).strict();

const reviewCaseSummarySchema = z.object({
  publicId: z.string().regex(/^review_[0-9a-f]{32}$/), caseType: reviewCaseTypeSchema,
  priority: reviewPrioritySchema, state: reviewStateSchema,
  source: z.object({ key: z.string(), name: z.string() }).nullable(), reasonCodes: z.array(z.string()),
  candidate: z.object({ name: z.string(), kind: z.string().nullable(), sourceRecordId: z.string().nullable() }).nullable(),
  confidence: z.number().min(0).max(1).nullable(), confidenceBand: reviewConfidenceBandSchema,
  ageSeconds: z.number().nonnegative(), assignee: z.string().nullable(),
  recommendedAction: reviewRecommendationSchema, risk: z.enum(['low', 'medium', 'high']),
  createdAt: z.string(), updatedAt: z.string(), observedAt: z.string().nullable(),
  organization: z.object({ publicId: z.string(), name: z.string().nullable() }).nullable(),
});

export const dataPlatformReviewListSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  cases: z.array(reviewCaseSummarySchema), count: z.number().int().nonnegative(), total: z.number().int().nonnegative(),
  hasMore: z.boolean(), nextCursor: z.string().nullable(),
  sort: z.enum(['priority:desc', 'createdAt:asc', 'confidence:desc']),
  filters: z.object({
    caseType: reviewCaseTypeSchema.nullable(), sourceKey: z.string().nullable(), reasonCode: z.string().nullable(),
    priority: reviewPrioritySchema.nullable(), confidenceBand: reviewConfidenceBandSchema.nullable(),
    age: z.enum(['over24h', 'over7d', 'over30d']).nullable(), state: reviewStateSchema,
    assignee: z.enum(['assigned', 'unassigned']).nullable(),
  }),
  filterOptions: z.object({
    caseTypes: z.array(reviewCaseTypeSchema), states: z.array(reviewStateSchema), priorities: z.array(reviewPrioritySchema),
    confidenceBands: z.array(reviewConfidenceBandSchema), ageBands: z.array(z.enum(['over24h', 'over7d', 'over30d'])),
    sources: z.array(z.string()), reasons: z.array(z.string()), assignees: z.array(z.string()),
  }),
});

const candidateSchema = z.object({
  publicId: z.string(), name: z.string(), lifecycleState: z.string(), score: z.number().min(0).max(1),
  method: z.enum(['identifier_exact', 'exact_match_key', 'name_token_similarity']),
  identifiers: z.array(z.object({ kind: z.string(), value: z.string() })),
  fields: z.array(z.object({ path: z.string(), value: z.unknown(), confidence: z.number(), freshnessExpiresAt: z.string().nullable() })),
});

export const dataPlatformReviewDetailSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  case: z.object({
    publicId: z.string().regex(/^review_[0-9a-f]{32}$/), caseType: reviewCaseTypeSchema,
    priority: reviewPrioritySchema, state: reviewStateSchema, reasonCodes: z.array(z.string()),
    assignee: z.string().nullable(), context: z.record(z.string(), z.unknown()),
    resolution: z.record(z.string(), z.unknown()).nullable(), ageSeconds: z.number().nonnegative(),
    confidence: z.number().min(0).max(1).nullable(), confidenceBand: reviewConfidenceBandSchema,
    risk: z.enum(['low', 'medium', 'high']), createdAt: z.string(), updatedAt: z.string(), resolvedAt: z.string().nullable(),
  }),
  evidence: z.object({
    publicId: z.string(), sourceRecordId: z.string().nullable(), candidateName: z.string().nullable(), candidateKind: z.string().nullable(),
    observedAt: z.string().nullable(), collectedAt: z.string().nullable(), collectionMethod: z.string().nullable(),
    publicationStatus: z.string().nullable(), evidenceUrl: z.string().nullable(),
    observedFields: z.record(z.string(), z.unknown()), stableIdentifiers: z.array(z.object({ kind: z.string(), key: z.string() })),
  }).nullable(),
  source: z.object({
    key: z.string(), name: z.string().nullable(), type: z.string().nullable(), authorityLevel: z.string().nullable(),
    accessMethod: z.string().nullable(), baseUrl: z.string().nullable(), termsUrl: z.string().nullable(), licence: z.string().nullable(),
    rightsReviewStatus: z.string().nullable(), productionIngestionStatus: z.string().nullable(), defaultUsageClass: z.string().nullable(),
    allowedPurposes: z.array(z.string()), attributionRequired: z.boolean(), attribution: z.string().nullable(),
    storagePolicy: z.string().nullable(), refreshPolicy: z.string().nullable(), policyEffectiveAt: z.string().nullable(), policyExpiresAt: z.string().nullable(),
    fieldRights: z.array(z.object({
      fieldPathPattern: z.string(), usageClass: z.string(), allowedPurposes: z.array(z.string()), attribution: z.string().nullable(),
      policyBasis: z.string(), effectiveAt: z.string(), expiresAt: z.string().nullable(),
    })),
  }).nullable(),
  candidates: z.array(candidateSchema),
  contradictions: z.array(z.object({ severity: z.enum(['info', 'warning', 'critical']), code: z.string(), summary: z.string() })),
  recommendedAction: reviewRecommendationSchema,
  availableActions: z.object({
    createNew: z.boolean(), linkExisting: z.boolean(), dismiss: z.boolean(),
    assignment: z.object({ available: z.literal(false), reason: z.string() }),
  }),
});

export type DataPlatformOverview = z.infer<typeof dataPlatformOverviewSchema>;
export type DataPlatformRunList = z.infer<typeof dataPlatformRunListSchema>;
export type DataPlatformRunDetail = z.infer<typeof dataPlatformRunDetailSchema>;
export type DataPlatformReviewList = z.infer<typeof dataPlatformReviewListSchema>;
export type DataPlatformReviewDetail = z.infer<typeof dataPlatformReviewDetailSchema>;
