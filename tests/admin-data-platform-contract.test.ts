import { describe, expect, test } from 'bun:test';
import {
  dataPlatformOverviewSchema,
  dataPlatformRunDetailSchema,
  dataPlatformRunListQuerySchema,
  dataPlatformRunListSchema,
  dataPlatformReviewDetailSchema,
  dataPlatformReviewListQuerySchema,
  dataPlatformReviewListSchema,
} from '@/lib/admin/data-platform-contract';

const validOverview = {
  contractVersion: 'admin-data-platform.v1',
  generatedAt: '2026-07-28T12:00:00.000Z',
  health: { state: 'healthy', label: 'Healthy', summary: 'No issue.', reasonCodes: [], lastActivityAt: null },
  windows: {
    snapshot: { kind: 'snapshot', label: 'Current totals', from: null, to: '2026-07-28T12:00:00.000Z' },
    recent: { kind: 'rolling', label: 'Last 24 hours', from: '2026-07-27T12:00:00.000Z', to: '2026-07-28T12:00:00.000Z' },
  },
  trends: { available: false, reason: 'No aggregate.' },
  metrics: {
    organizations: 0, publishedOrganizations: 0, publishableOrganizations: 0, sources: 0,
    operationalSources: 0, blockedSources: 0, observations: 0, openReviews: 0, actionableEntityMatchReviews: 0, urgentReviews: 0,
    ingestionRuns: 0, activeRuns: 0, failedRuns24h: 0, failedItems: 0, retryingItems: 0,
  },
  currentRun: null,
  attentionItems: [], readiness: [], recentActivity: [], recentRuns: [], sources: [], reviewBreakdown: [],
};

const validRun = {
  publicId: 'run_11111111111111111111111111111111', sourceKey: 'bank_of_tanzania',
  sourceName: 'Bank of Tanzania', connectorKey: 'bot_initial_snapshot', parserVersion: '1',
  triggerKind: 'import', state: 'running', stage: 'capture', operationalStatus: 'active',
  itemsSeen: 10, itemsAccepted: 8, itemsSkipped: 1, itemsRetrying: 1, itemsReviewRouted: 2,
  itemsFailed: 1, startedAt: '2026-07-28T12:00:00.000Z', completedAt: null,
  createdAt: '2026-07-28T12:00:00.000Z', lastActivityAt: '2026-07-28T12:01:00.000Z',
};

describe('Data Platform gateway contract', () => {
  test('accepts the current versioned Core overview', () => {
    expect(dataPlatformOverviewSchema.safeParse(validOverview).success).toBe(true);
  });

  test('fails closed when Core changes the version or health vocabulary', () => {
    expect(dataPlatformOverviewSchema.safeParse({ ...validOverview, contractVersion: 'admin-data-platform.v2' }).success).toBe(false);
    expect(dataPlatformOverviewSchema.safeParse({ ...validOverview, health: { ...validOverview.health, state: 'fine' } }).success).toBe(false);
  });

  test('accepts bounded run lists and rejects unsupported filters', () => {
    expect(dataPlatformRunListSchema.safeParse({
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-28T12:02:00.000Z',
      runs: [validRun], count: 1, total: 1, hasMore: false, nextCursor: null,
      sort: 'createdAt:desc', filters: { state: null, sourceKey: null, connectorKey: null, createdFrom: null, createdTo: null },
    }).success).toBe(true);
    expect(dataPlatformRunListQuerySchema.safeParse({ state: 'running', limit: '25' }).success).toBe(true);
    expect(dataPlatformRunListQuerySchema.safeParse({ invented: 'yes' }).success).toBe(false);
  });

  test('accepts run detail with truthful uninstrumented stages and disabled mutations', () => {
    const stageProgress = ['capture', 'extract', 'normalise', 'resolve', 'enrich', 'review', 'ready', 'publish'].map((key) => ({
      key, label: key, meaning: `${key} meaning`, status: key === 'normalise' || key === 'enrich' ? 'not_instrumented' : 'waiting',
      processed: null, failed: 0, note: 'No event recorded.',
    }));
    expect(dataPlatformRunDetailSchema.safeParse({
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-28T12:02:00.000Z',
      run: { ...validRun, processingProfile: 'universal', legacySectorPack: 'universal', configuration: {} },
      stageProgress,
      counters: { seen: 10, accepted: 8, skipped: 1, retrying: 1, reviewRouted: 2, failed: 1, byItemState: [] },
      throughput: { durationSeconds: 120, itemsPerMinute: 5, basis: 'durable counters' },
      estimatedCompletion: { at: null, reason: 'No reliable total.' }, eventTimeline: [], eventCounts: [],
      errorSummary: {}, errorCategories: [], boundedItemSample: [], checkpointBefore: {}, checkpointAfter: null,
      estimatedCost: { minor: 0, currency: 'USD' }, objectEvidenceStatus: { storedObjects: 8, observations: 8 },
      availableActions: {
        retry: { available: false, reason: 'Not supported.' }, cancel: { available: false, reason: 'Not supported.' },
        resume: { available: false, reason: 'Not supported.' },
      },
      remediationLinks: { workQueue: '/data-platform/reviews?state=open', source: '/data-platform/sources?sourceKey=bank_of_tanzania' },
    }).success).toBe(true);
  });

  test('accepts the unified review queue and rejects unknown or out-of-range filters', () => {
    const review = {
      publicId: 'review_11111111111111111111111111111111', caseType: 'entity_match', priority: 'high', state: 'open',
      source: { key: 'tcra_licensed_providers', name: 'TCRA Licensed Providers' }, reasonCodes: ['possible_duplicate'],
      candidate: { name: 'Example Limited', kind: 'legal_entity', sourceRecordId: 'TCRA-1' },
      confidence: 0.92, confidenceBand: 'high', ageSeconds: 3600, assignee: null,
      recommendedAction: { action: null, candidatePublicId: null, label: 'Compare candidates', rationale: 'Review required.' },
      risk: 'medium', createdAt: '2026-07-28T10:00:00.000Z', updatedAt: '2026-07-28T10:01:00.000Z',
      observedAt: '2026-07-28T09:00:00.000Z', organization: null,
    };
    expect(dataPlatformReviewListSchema.safeParse({
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-28T12:00:00.000Z',
      cases: [review], count: 1, total: 101, hasMore: true, nextCursor: 'cursor', sort: 'priority:desc',
      filters: { caseType: null, sourceKey: null, reasonCode: null, priority: null, confidenceBand: null, age: null, state: 'open', assignee: null },
      filterOptions: {
        caseTypes: ['entity_match'], states: ['open'], priorities: ['high'], confidenceBands: ['high'], ageBands: ['over24h'],
        sources: ['tcra_licensed_providers'], reasons: ['possible_duplicate'], assignees: [],
      },
    }).success).toBe(true);
    expect(dataPlatformReviewListQuerySchema.safeParse({ state: 'open', limit: '100', sort: 'confidence:desc' }).success).toBe(true);
    expect(dataPlatformReviewListQuerySchema.safeParse({ state: 'invented' }).success).toBe(false);
    expect(dataPlatformReviewListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(dataPlatformReviewListQuerySchema.safeParse({ invented: 'yes' }).success).toBe(false);
  });

  test('accepts review detail and fails closed when protected evidence fields drift', () => {
    const detail = {
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-28T12:00:00.000Z',
      case: {
        publicId: 'review_11111111111111111111111111111111', caseType: 'entity_match', priority: 'high', state: 'open',
        reasonCodes: ['possible_duplicate'], assignee: null, context: {}, resolution: null, ageSeconds: 3600,
        confidence: 1, confidenceBand: 'exact', risk: 'low', createdAt: '2026-07-28T10:00:00.000Z',
        updatedAt: '2026-07-28T10:01:00.000Z', resolvedAt: null,
      },
      evidence: {
        publicId: 'obs_11111111111111111111111111111111', sourceRecordId: 'TCRA-1', candidateName: 'Example Limited',
        candidateKind: 'legal_entity', observedAt: '2026-07-28T09:00:00.000Z', collectedAt: '2026-07-28T09:01:00.000Z',
        collectionMethod: 'csv', publicationStatus: 'internal_only', evidenceUrl: null,
        observedFields: { 'identity.legal_name': 'Example Limited' }, stableIdentifiers: [],
      },
      source: null, candidates: [], contradictions: [],
      recommendedAction: { action: 'create_new', candidatePublicId: null, label: 'Create provisional organization', rationale: 'No candidate.' },
      availableActions: { createNew: true, linkExisting: true, dismiss: true, assignment: { available: false, reason: 'Not supported.' } },
    };
    expect(dataPlatformReviewDetailSchema.safeParse(detail).success).toBe(true);
    expect(dataPlatformReviewDetailSchema.safeParse({ ...detail, case: { ...detail.case, confidence: 1.2 } }).success).toBe(false);
    expect(dataPlatformReviewDetailSchema.safeParse({ ...detail, availableActions: { ...detail.availableActions, assignment: { available: true, reason: 'Drift.' } } }).success).toBe(false);
  });
});
