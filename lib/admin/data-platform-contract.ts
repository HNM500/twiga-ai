import { z } from 'zod';

const actionSchema = z.object({ label: z.string(), href: z.string().startsWith('/data-platform') });
const runSchema = z.object({
  publicId: z.string(), sourceKey: z.string(), sourceName: z.string(), connectorKey: z.string(),
  triggerKind: z.string(), state: z.string(), itemsSeen: z.number(), itemsAccepted: z.number(),
  itemsSkipped: z.number(), itemsFailed: z.number(), startedAt: z.string().nullable(),
  completedAt: z.string().nullable(), createdAt: z.string().nullable(), lastActivityAt: z.string().nullable(),
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
    key: z.enum(['capture', 'extract', 'normalise', 'resolve', 'enrich', 'review', 'ready', 'publish']),
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

export type DataPlatformOverview = z.infer<typeof dataPlatformOverviewSchema>;
