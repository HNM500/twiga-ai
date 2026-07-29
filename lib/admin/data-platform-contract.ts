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

const organizationEntityKindSchema = z.enum(['legal_entity', 'public_brand', 'licensed_institution']);
const organizationOperatingStatusSchema = z.enum(['active', 'temporarily_unavailable', 'closed', 'unknown']);
const organizationLifecycleSchema = z.enum(['candidate', 'review', 'publishable', 'published', 'archived']);
const readinessProductSchema = z.enum(['directory_ready', 'chat_ready', 'enterprise_ready', 'claim_ready', 'twiga_verified']);
const readinessStatusSchema = z.enum(['not_ready', 'ready', 'stale', 'blocked', 'review_required']);
const unavailableActionSchema = z.object({ available: z.literal(false), reason: z.string() });

export const dataPlatformOrganizationListQuerySchema = z.object({
  query: z.string().trim().min(1).max(240).optional(),
  entityKind: organizationEntityKindSchema.optional(),
  operatingStatus: organizationOperatingStatusSchema.optional(),
  lifecycleState: organizationLifecycleSchema.optional(),
  category: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9._:-]*$/i).optional(),
  region: z.string().trim().min(1).max(160).optional(),
  readinessProduct: readinessProductSchema.optional(),
  cursor: z.string().trim().min(1).max(1_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['canonicalName:asc', 'updatedAt:desc', 'completeness:asc']).default('updatedAt:desc'),
}).strict();

const readinessSummarySchema = z.object({
  profileKey: readinessProductSchema, status: readinessStatusSchema, evaluatedAt: z.string(),
  expiresAt: z.string().nullable(), blockingReasonCodes: z.array(z.string()),
});

export const dataPlatformOrganizationListSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  organizations: z.array(z.object({
    publicId: z.string().regex(/^org_[0-9a-f]{32}$/), canonicalName: z.string(), entityKind: organizationEntityKindSchema,
    operatingStatus: organizationOperatingStatusSchema, lifecycleState: organizationLifecycleSchema,
    version: z.number().int().positive(), selectedFieldCount: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(1).nullable(),
    freshness: z.object({ state: z.enum(['fresh', 'stale', 'unknown']), staleFieldCount: z.number().int().nonnegative(), nextExpiryAt: z.string().nullable() }),
    openReviewCount: z.number().int().nonnegative(), productReadiness: z.array(readinessSummarySchema), updatedAt: z.string(),
  })),
  count: z.number().int().nonnegative(), total: z.number().int().nonnegative(), hasMore: z.boolean(), nextCursor: z.string().nullable(),
  sort: z.enum(['canonicalName:asc', 'updatedAt:desc', 'completeness:asc']),
  filters: z.object({
    query: z.string().nullable(), entityKind: organizationEntityKindSchema.nullable(), operatingStatus: organizationOperatingStatusSchema.nullable(),
    lifecycleState: organizationLifecycleSchema.nullable(), category: z.string().nullable(), region: z.string().nullable(), readinessProduct: readinessProductSchema.nullable(),
  }),
  filterOptions: z.object({
    entityKinds: z.array(organizationEntityKindSchema), operatingStatuses: z.array(organizationOperatingStatusSchema),
    lifecycleStates: z.array(organizationLifecycleSchema), categories: z.array(z.object({ code: z.string(), label: z.string() })),
    regions: z.array(z.string()), readinessProducts: z.array(readinessProductSchema),
  }),
});

export const dataPlatformOrganizationDetailSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  organization: z.object({
    publicId: z.string().regex(/^org_[0-9a-f]{32}$/), canonicalName: z.string(), entityKind: organizationEntityKindSchema,
    countryCode: z.string(), operatingStatus: organizationOperatingStatusSchema, lifecycleState: organizationLifecycleSchema,
    version: z.number().int().positive(), createdAt: z.string(), updatedAt: z.string(), archivedAt: z.string().nullable(),
  }),
  names: z.array(z.object({ name: z.string(), kind: z.string(), languageCode: z.string().nullable(), isPrimary: z.boolean(), validFrom: z.unknown().nullable(), validTo: z.unknown().nullable(), createdAt: z.string() })),
  categories: z.array(z.object({ code: z.string(), label: z.string(), labelSw: z.string().nullable(), isPrimary: z.boolean(), confidence: z.number().min(0).max(1).nullable() })),
  services: z.array(z.object({ code: z.string(), label: z.string(), labelSw: z.string().nullable(), confidence: z.number().min(0).max(1).nullable() })),
  locations: z.array(z.object({
    publicId: z.string(), locationKind: z.string(), name: z.string().nullable(), countryCode: z.string(), region: z.string().nullable(), district: z.string().nullable(),
    ward: z.string().nullable(), neighbourhood: z.string().nullable(), streetAddress: z.string().nullable(), landmark: z.string().nullable(), postalAddress: z.string().nullable(),
    latitude: z.number().nullable(), longitude: z.number().nullable(), coordinatePrecision: z.string().nullable(), serviceAreaCodes: z.array(z.string()),
    nationwide: z.boolean(), remoteService: z.boolean(), operatingStatus: z.string(), createdAt: z.string(), updatedAt: z.string(),
  })),
  servicePoints: z.array(z.object({
    publicId: z.string(), locationKind: z.string(), name: z.string().nullable(), countryCode: z.string(), region: z.string().nullable(), district: z.string().nullable(),
    ward: z.string().nullable(), neighbourhood: z.string().nullable(), streetAddress: z.string().nullable(), landmark: z.string().nullable(), postalAddress: z.string().nullable(),
    latitude: z.number().nullable(), longitude: z.number().nullable(), coordinatePrecision: z.string().nullable(), serviceAreaCodes: z.array(z.string()),
    nationwide: z.boolean(), remoteService: z.boolean(), operatingStatus: z.string(), createdAt: z.string(), updatedAt: z.string(),
  })),
  relationships: z.array(z.object({
    kind: z.string(), direction: z.enum(['inbound', 'outbound']),
    relatedOrganization: z.object({ publicId: z.string(), name: z.string(), entityKind: z.string() }),
    validFrom: z.unknown().nullable(), validTo: z.unknown().nullable(), createdAt: z.string(),
  })),
  licences: z.array(z.object({
    publicId: z.string(), regulatorCode: z.string(), licenceNumber: z.string(), licenceType: z.string().nullable(), sector: z.string().nullable(),
    issuedOn: z.unknown().nullable(), expiresOn: z.unknown().nullable(), status: z.string(), confidence: z.number().min(0).max(1).nullable(),
    observationPublicId: z.string(), sourceKey: z.string(), createdAt: z.string(), updatedAt: z.string(),
  })),
  canonicalFields: z.array(z.object({
    path: z.string(), value: z.unknown(), confidence: z.number().min(0).max(1).nullable(), freshnessExpiresAt: z.string().nullable(), isStale: z.boolean(),
    resolutionMethod: z.string(), resolutionVersion: z.string(), selectedAt: z.string(), selectedBy: z.string(), observedAt: z.string(),
    observationPublicId: z.string(), source: z.object({ key: z.string(), name: z.string() }),
  })),
  alternativeObservations: z.array(z.object({
    path: z.string(), originalValue: z.unknown(), normalizedValue: z.unknown(), extractionMethod: z.string(), confidence: z.number().min(0).max(1).nullable(),
    observedAt: z.string(), observationPublicId: z.string(), publicationStatus: z.string(), source: z.object({ key: z.string(), name: z.string() }), isSelected: z.boolean(),
  })).max(100),
  conflicts: z.array(z.object({ path: z.string(), distinctValues: z.number().int().min(2), latestObservedAt: z.string() })),
  productReadiness: z.array(z.object({
    profileKey: readinessProductSchema, status: readinessStatusSchema, requiredFieldPaths: z.array(z.string()), missingFieldPaths: z.array(z.string()),
    blockingReasonCodes: z.array(z.string()), policyVersion: z.string(), evaluatedAt: z.string(), expiresAt: z.string().nullable(), explanation: z.unknown(),
  })),
  reviews: z.array(z.object({
    publicId: z.string(), caseType: reviewCaseTypeSchema, priority: reviewPrioritySchema, state: reviewStateSchema,
    reasonCodes: z.array(z.string()), assignee: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
  })).max(30),
  history: z.array(z.object({ version: z.number().int().positive(), operation: z.string(), snapshot: z.unknown(), changedAt: z.string(), changedBy: z.string() })).max(30),
  availableActions: z.object({ publish: unavailableActionSchema, merge: unavailableActionSchema, split: unavailableActionSchema, enrich: unavailableActionSchema }),
});

export const dataPlatformSourceListQuerySchema = z.object({
  sourceType: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9._:-]*$/i).optional(),
  authorityLevel: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9._:-]*$/i).optional(),
  rightsReviewStatus: z.enum(['required', 'approved', 'approved_with_conditions', 'rejected']).optional(),
  productionIngestionStatus: z.enum(['not_configured', 'blocked', 'approved', 'approved_with_conditions']).optional(),
  connectorState: z.enum(['enabled', 'disabled', 'not_configured']).optional(),
  cursor: z.string().trim().min(1).max(1_000).optional(), limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['name:asc', 'lastObservedAt:desc', 'observationCount:desc']).default('name:asc'),
}).strict();

export const dataPlatformSourceListSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  sources: z.array(z.object({
    sourceKey: z.string(), name: z.string(), sourceType: z.string(), authorityLevel: z.string(), rightsReviewStatus: z.string(),
    productionIngestionStatus: z.string(), defaultUsageClass: z.string(), connectorState: z.enum(['enabled', 'disabled', 'not_configured']),
    observationCount: z.number().int().nonnegative(), lastObservedAt: z.string().nullable(), latestRunState: z.string().nullable(), latestRunAt: z.string().nullable(),
  })),
  count: z.number().int().nonnegative(), total: z.number().int().nonnegative(), hasMore: z.boolean(), nextCursor: z.string().nullable(),
  sort: z.enum(['name:asc', 'lastObservedAt:desc', 'observationCount:desc']),
  filters: z.object({ sourceType: z.string().nullable(), authorityLevel: z.string().nullable(), rightsReviewStatus: z.string().nullable(), productionIngestionStatus: z.string().nullable(), connectorState: z.string().nullable() }),
  filterOptions: z.object({ sourceTypes: z.array(z.string()), authorityLevels: z.array(z.string()), rightsReviewStatuses: z.array(z.string()), productionIngestionStatuses: z.array(z.string()), connectorStates: z.array(z.string()) }),
});

export const dataPlatformSourceDetailSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  source: z.object({
    key: z.string(), name: z.string(), type: z.string(), jurisdiction: z.string(), authorityLevel: z.string(), accessMethod: z.string(),
    baseUrl: z.string().nullable(), termsUrl: z.string().nullable(), licence: z.string(), notes: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
  }),
  rightsPolicy: z.object({ reviewStatus: z.string(), productionIngestionStatus: z.string(), defaultUsageClass: z.string(), effectiveAt: z.string(), expiresAt: z.string().nullable() }),
  fieldPolicies: z.array(z.object({ fieldPathPattern: z.string(), usageClass: z.string(), allowedPurposes: z.array(z.string()), attribution: z.string().nullable(), policyBasis: z.string(), effectiveAt: z.string(), expiresAt: z.string().nullable() })),
  permittedPurposes: z.array(z.string()), retention: z.object({ storagePolicy: z.string(), rawRetentionDays: z.number().int().positive().nullable() }),
  attribution: z.object({ required: z.boolean(), text: z.string().nullable() }),
  connectorConfigs: z.array(z.object({
    key: z.string(), enabled: z.boolean(), scheduleExpression: z.string().nullable(), parserVersion: z.string(), requestsPerMinute: z.number().int(),
    maxAttempts: z.number().int(), baseBackoffSeconds: z.number().int(), processingProfile: z.string(), privateConfigurationStored: z.literal(true),
    createdAt: z.string(), updatedAt: z.string(),
  })),
  checkpoints: z.array(z.object({ connectorKey: z.string(), checkpoint: z.unknown(), updatedAt: z.string(), lastSuccessfulRunPublicId: z.string().nullable() })),
  recentRuns: z.array(z.object({
    publicId: z.string(), connectorKey: z.string(), parserVersion: z.string(), triggerKind: z.string(), state: z.string(), itemsSeen: z.number(), itemsAccepted: z.number(),
    itemsSkipped: z.number(), itemsFailed: z.number(), estimatedCostMinor: z.number(), currency: z.string(), startedAt: z.string().nullable(), completedAt: z.string().nullable(), createdAt: z.string(),
  })).max(20),
  qualityMetrics: z.object({ observations: z.number(), targetedObservations: z.number(), linkedObservations: z.number(), openReviews: z.number(), failedRuns24h: z.number(), lastObservedAt: z.string().nullable() }),
  cost: z.object({ estimatedByCurrency: z.array(z.object({ currency: z.string(), totalMinor: z.number() })) }),
  availableActions: z.object({ dryRun: unavailableActionSchema, import: unavailableActionSchema, editPolicy: unavailableActionSchema, editSchedule: unavailableActionSchema }),
});

const evidenceGroupRoleSchema = z.enum([
  'legal_entity', 'operating_business', 'brand', 'person', 'regulator', 'government_body',
  'ngo', 'association', 'educational_institution', 'informal_business', 'supporting_record', 'unknown',
]);
const localityPostureSchema = z.enum(['tanzania_evidence', 'foreign_evidence', 'conflicting_evidence', 'unknown', 'not_applicable']);

export const evidenceGroupListQuerySchema = z.object({
  sourceKey: z.string().trim().min(1).max(120).optional(),
  entityRole: evidenceGroupRoleSchema.optional(),
  localityPosture: localityPostureSchema.optional(),
  query: z.string().trim().min(2).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

const evidenceGroupPostureSchema = z.object({
  entityRole: evidenceGroupRoleSchema,
  locality: localityPostureSchema,
  productEligibility: z.enum(['review_required', 'not_eligible', 'unknown']),
  confidence: z.number().min(0).max(1),
  reasonCodes: z.array(z.string()),
});

export const evidenceGroupListSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  groups: z.array(z.object({
    publicId: z.string().regex(/^evidence_group_[0-9a-f]{32}$/), representativeName: z.string(),
    subjectKind: z.enum(['organization', 'person', 'supporting_record']), groupingKeyKind: z.string(),
    source: z.object({ key: z.string(), name: z.string() }).nullable(),
    memberCount: z.number().int().nonnegative(), openCaseCount: z.number().int().nonnegative(),
    licenceCount: z.number().int().nonnegative(), posture: evidenceGroupPostureSchema.nullable(),
    recommendationCounts: z.record(z.string(), z.number().int().nonnegative()), updatedAt: z.string(),
    impactPreviewHref: z.string().startsWith('/data-platform/evidence-groups/'),
  })),
  count: z.number().int().nonnegative(),
  filters: z.object({
    sourceKey: z.string().nullable(), entityRole: evidenceGroupRoleSchema.nullable(),
    localityPosture: localityPostureSchema.nullable(), query: z.string().nullable(),
  }),
  capabilities: z.object({ read: z.literal(true), groupMutations: z.literal(false) }),
});

export const evidenceGroupDetailSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  group: z.object({
    publicId: z.string().regex(/^evidence_group_[0-9a-f]{32}$/), representativeName: z.string(),
    subjectKind: z.enum(['organization', 'person', 'supporting_record']), groupingKeyKind: z.string(),
    groupingKeyDisplay: z.string(), groupingPolicyVersion: z.string(),
    source: z.object({ key: z.string(), name: z.string() }).nullable(), updatedAt: z.string(),
  }),
  posture: evidenceGroupPostureSchema.extend({
    publicId: z.string(), policyVersion: z.string(), evidence: z.record(z.string(), z.unknown()), assessedAt: z.string(),
  }).nullable(),
  impactPreview: z.object({
    members: z.array(z.object({
      observationPublicId: z.string(), candidateName: z.string(), candidateKind: z.string(),
      sourceRecordId: z.string().nullable(), observedFields: z.record(z.string(), z.unknown()),
      membershipReason: z.string(), reviewPublicId: z.string().nullable(), reviewState: z.string().nullable(),
      recommendation: z.string().nullable(), confidence: z.number().min(0).max(1).nullable(),
      licencePublicId: z.string().nullable(), licenceNumber: z.string().nullable(), licenceType: z.string().nullable(),
    })),
    observationCount: z.number().int().nonnegative(), openReviewIds: z.array(z.string()), licenceIds: z.array(z.string()),
  }),
  capabilities: z.object({ read: z.literal(true), groupMutations: z.literal(false) }),
});

const resolutionRecommendationSchema = z.enum([
  'link_existing', 'create_provisional', 'enrich_then_retry', 'hold_for_review', 'not_product_eligible',
]);
const resolutionReviewProgressSchema = z.object({
  pendingCount: z.number().int().nonnegative(), confirmedCount: z.number().int().nonnegative(),
  correctedCount: z.number().int().nonnegative(), rejectedCount: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(), readyForConfirmation: z.boolean(),
});
const resolutionLabelEvidenceReferenceSchema = z.object({
  kind: z.enum(['url', 'source_observation', 'review_case', 'document', 'note']),
  reference: z.string().min(1).max(2_048), note: z.string().min(1).max(500).optional(),
}).strict();
const resolutionEvaluationCapabilitiesSchema = z.object({
  read: z.literal(true), reviewLabels: z.boolean(), confirmSet: z.literal(false),
});
const resolutionSubjectSnapshotSchema = z.object({
  candidateName: z.string().optional(), organizationName: z.string().optional(), name: z.string().optional(),
  legalName: z.string().optional(), providerName: z.string().optional(), topCandidate: z.string().optional(),
  sourceRecordId: z.string().optional(), observationPublicId: z.string().optional(), groupPublicId: z.string().optional(),
  worksheetLabel: z.string().optional(), score: z.number().optional(),
});

export const resolutionEvaluationSetListSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  evaluationSets: z.array(z.object({
    publicId: z.string().regex(/^resolution_set_[0-9a-f]{32}$/), datasetKey: z.string(), version: z.number().int().positive(),
    status: z.enum(['draft', 'provisional', 'confirmed', 'retired']), sourceKey: z.string().nullable(),
    labelCount: z.number().int().nonnegative(), reviewProgress: resolutionReviewProgressSchema,
    createdAt: z.string(), detailHref: z.string().startsWith('/data-platform/resolution-quality/'),
    capabilities: resolutionEvaluationCapabilitiesSchema,
    latestScore: z.object({
      publicId: z.string(), shadowRunPublicId: z.string().nullable(), agreementRate: z.number().min(0).max(1).nullable(),
      evaluatedCount: z.number().int().nonnegative(), scoredAt: z.string().nullable(),
      metricSemantics: z.enum(['confirmed_quality_evaluation', 'provisional_agreement_only']),
    }).nullable(),
  })),
  count: z.number().int().nonnegative(),
});

const resolutionLabelLatestReviewSchema = z.object({
  publicId: z.string().regex(/^resolution_label_review_[0-9a-f]{32}$/),
  decision: z.enum(['confirm', 'correct', 'reject']),
  correctedRecommendation: resolutionRecommendationSchema.nullable(),
  effectiveRecommendation: resolutionRecommendationSchema.nullable(),
  rationale: z.string(), evidenceReferences: z.array(resolutionLabelEvidenceReferenceSchema),
  reviewedBy: z.string(), reviewedAt: z.string(),
});

export const resolutionEvaluationSetDetailSchema = z.object({
  contractVersion: z.literal('admin-data-platform.v1'), generatedAt: z.string(),
  evaluationSet: z.object({
    publicId: z.string().regex(/^resolution_set_[0-9a-f]{32}$/), datasetKey: z.string(),
    version: z.number().int().positive(), status: z.enum(['draft', 'provisional', 'confirmed', 'retired']),
    sourceKey: z.string().nullable(), notes: z.string().nullable(), createdBy: z.string(), createdAt: z.string(),
  }),
  progress: resolutionReviewProgressSchema.extend({ labelCount: z.number().int().nonnegative() }),
  labels: z.array(z.object({
    publicId: z.string().regex(/^resolution_label_[0-9a-f]{32}$/),
    reviewPublicId: z.string().regex(/^review_[0-9a-f]{32}$/), lane: z.string(),
    subjectSnapshot: resolutionSubjectSnapshotSchema, originalRecommendation: resolutionRecommendationSchema,
    rationale: z.string(), evidenceReferences: z.array(resolutionLabelEvidenceReferenceSchema),
    actualRecommendation: resolutionRecommendationSchema.nullable(), actualConfidence: z.number().min(0).max(1).nullable(),
    reviewState: z.enum(['pending', 'confirm', 'correct', 'reject']),
    effectiveRecommendation: resolutionRecommendationSchema.nullable(),
    latestReview: resolutionLabelLatestReviewSchema.nullable(), createdAt: z.string(),
  })),
  capabilities: resolutionEvaluationCapabilitiesSchema,
});

export const resolutionLabelReviewInputSchema = z.object({
  decision: z.enum(['confirm', 'correct', 'reject']),
  correctedRecommendation: resolutionRecommendationSchema.optional(),
  reason: z.string().trim().min(8).max(2_000),
  evidenceReferences: z.array(resolutionLabelEvidenceReferenceSchema).max(20),
  expectedLatestReviewPublicId: z.union([
    z.string().regex(/^resolution_label_review_[0-9a-f]{32}$/), z.null(),
  ]),
}).strict().superRefine((value, context) => {
  if (value.decision === 'correct' && !value.correctedRecommendation) {
    context.addIssue({ code: 'custom', path: ['correctedRecommendation'], message: 'A correction is required' });
  }
  if (value.decision !== 'correct' && value.correctedRecommendation) {
    context.addIssue({ code: 'custom', path: ['correctedRecommendation'], message: 'Only corrections can change the recommendation' });
  }
  if (value.decision !== 'reject' && value.evidenceReferences.length === 0) {
    context.addIssue({ code: 'custom', path: ['evidenceReferences'], message: 'Evidence is required' });
  }
});

export const resolutionLabelReviewResultSchema = z.object({
  evaluationSetPublicId: z.string().regex(/^resolution_set_[0-9a-f]{32}$/),
  labelPublicId: z.string().regex(/^resolution_label_[0-9a-f]{32}$/),
  latestReview: resolutionLabelLatestReviewSchema,
  progress: resolutionReviewProgressSchema.extend({ labelCount: z.number().int().nonnegative() }),
  capabilities: z.object({ reviewLabels: z.literal(true), confirmSet: z.literal(false) }),
});

export type DataPlatformOverview = z.infer<typeof dataPlatformOverviewSchema>;
export type DataPlatformRunList = z.infer<typeof dataPlatformRunListSchema>;
export type DataPlatformRunDetail = z.infer<typeof dataPlatformRunDetailSchema>;
export type DataPlatformReviewList = z.infer<typeof dataPlatformReviewListSchema>;
export type DataPlatformReviewDetail = z.infer<typeof dataPlatformReviewDetailSchema>;
export type DataPlatformOrganizationList = z.infer<typeof dataPlatformOrganizationListSchema>;
export type DataPlatformOrganizationDetail = z.infer<typeof dataPlatformOrganizationDetailSchema>;
export type DataPlatformSourceList = z.infer<typeof dataPlatformSourceListSchema>;
export type DataPlatformSourceDetail = z.infer<typeof dataPlatformSourceDetailSchema>;
export type EvidenceGroupList = z.infer<typeof evidenceGroupListSchema>;
export type EvidenceGroupDetail = z.infer<typeof evidenceGroupDetailSchema>;
export type ResolutionEvaluationSetList = z.infer<typeof resolutionEvaluationSetListSchema>;
export type ResolutionEvaluationSetDetail = z.infer<typeof resolutionEvaluationSetDetailSchema>;
export type ResolutionLabelReviewInput = z.infer<typeof resolutionLabelReviewInputSchema>;
