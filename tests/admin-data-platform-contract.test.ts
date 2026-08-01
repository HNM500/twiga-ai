import { describe, expect, test } from 'bun:test';
import {
  acquisitionDomainPolicyInputSchema,
  acquisitionPoliciesSchema,
  acquisitionSettingsUpdateSchema,
  dataPlatformOverviewSchema,
  dataPlatformRunDetailSchema,
  dataPlatformRunListQuerySchema,
  dataPlatformRunListSchema,
  dataPlatformReviewDetailSchema,
  dataPlatformReviewListQuerySchema,
  dataPlatformReviewListSchema,
  dataPlatformOrganizationDetailSchema,
  dataPlatformOrganizationListQuerySchema,
  dataPlatformOrganizationListSchema,
  dataPlatformSourceDetailSchema,
  dataPlatformSourceListQuerySchema,
  dataPlatformSourceListSchema,
  evidenceGroupDetailSchema,
  evidenceGroupListQuerySchema,
  evidenceGroupListSchema,
  externalEvidenceListQuerySchema,
  externalEvidenceListSchema,
  externalEvidenceRequestInputSchema,
  externalEvidenceSubmitResultSchema,
  resolutionEvaluationSetDetailSchema,
  resolutionEvaluationSetConfirmationInputSchema,
  resolutionEvaluationSetConfirmationResultSchema,
  resolutionEvaluationSetListSchema,
  resolutionLabelReviewInputSchema,
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

  test('accepts bounded business lists and fails closed on invented readiness states', () => {
    const organization = {
      publicId: `org_${'1'.repeat(32)}`, canonicalName: 'Example Tanzania Limited', entityKind: 'legal_entity',
      operatingStatus: 'active', lifecycleState: 'review', version: 1, selectedFieldCount: 2, confidence: 0.91,
      freshness: { state: 'fresh', staleFieldCount: 0, nextExpiryAt: '2026-08-28T12:00:00.000Z' },
      openReviewCount: 1, productReadiness: [{ profileKey: 'directory_ready', status: 'review_required', evaluatedAt: '2026-07-28T12:00:00.000Z', expiresAt: null, blockingReasonCodes: ['review_open'] }],
      updatedAt: '2026-07-28T12:00:00.000Z',
    };
    const list = {
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-28T12:00:00.000Z', organizations: [organization],
      count: 1, total: 101, hasMore: true, nextCursor: 'cursor', sort: 'updatedAt:desc',
      filters: { query: null, entityKind: null, operatingStatus: null, lifecycleState: null, category: null, region: null, readinessProduct: null },
      filterOptions: { entityKinds: ['legal_entity'], operatingStatuses: ['active'], lifecycleStates: ['review'], categories: [], regions: [], readinessProducts: ['directory_ready'] },
    };
    expect(dataPlatformOrganizationListSchema.safeParse(list).success).toBe(true);
    expect(dataPlatformOrganizationListQuerySchema.safeParse({ query: 'Example', limit: '100', sort: 'canonicalName:asc' }).success).toBe(true);
    expect(dataPlatformOrganizationListQuerySchema.safeParse({ invented: 'yes' }).success).toBe(false);
    expect(dataPlatformOrganizationListSchema.safeParse({ ...list, organizations: [{ ...organization, productReadiness: [{ ...organization.productReadiness[0], status: 'probably_ready' }] }] }).success).toBe(false);
  });

  test('accepts evidence-rich business detail only when unsupported mutations stay unavailable', () => {
    const unavailable = { available: false, reason: 'Requires an audited Core command.' } as const;
    const detail = {
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-28T12:00:00.000Z',
      organization: { publicId: `org_${'1'.repeat(32)}`, canonicalName: 'Example Tanzania Limited', entityKind: 'legal_entity', countryCode: 'TZ', operatingStatus: 'active', lifecycleState: 'review', version: 1, createdAt: '2026-07-28T10:00:00.000Z', updatedAt: '2026-07-28T12:00:00.000Z', archivedAt: null },
      names: [], categories: [], services: [], locations: [], servicePoints: [], relationships: [], licences: [], canonicalFields: [], alternativeObservations: [], conflicts: [], productReadiness: [], reviews: [], history: [],
      availableActions: { publish: unavailable, merge: unavailable, split: unavailable, enrich: unavailable },
    };
    expect(dataPlatformOrganizationDetailSchema.safeParse(detail).success).toBe(true);
    expect(dataPlatformOrganizationDetailSchema.safeParse({ ...detail, availableActions: { ...detail.availableActions, publish: { available: true, reason: 'Drift.' } } }).success).toBe(false);
  });

  test('accepts source registry and detail while rejecting private configuration drift', () => {
    const source = { sourceKey: 'tcra_licensed_providers', name: 'TCRA Licensed Providers', sourceType: 'regulator', authorityLevel: 'primary', rightsReviewStatus: 'approved', productionIngestionStatus: 'approved', defaultUsageClass: 'public_display', connectorState: 'enabled', observationCount: 100, lastObservedAt: '2026-07-28T12:00:00.000Z', latestRunState: 'completed', latestRunAt: '2026-07-28T12:00:00.000Z' };
    expect(dataPlatformSourceListSchema.safeParse({
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-28T12:00:00.000Z', sources: [source], count: 1, total: 1, hasMore: false, nextCursor: null, sort: 'name:asc',
      filters: { sourceType: null, authorityLevel: null, rightsReviewStatus: null, productionIngestionStatus: null, connectorState: null },
      filterOptions: { sourceTypes: ['regulator'], authorityLevels: ['primary'], rightsReviewStatuses: ['approved'], productionIngestionStatuses: ['approved'], connectorStates: ['enabled'] },
    }).success).toBe(true);
    expect(dataPlatformSourceListQuerySchema.safeParse({ connectorState: 'enabled', limit: '100' }).success).toBe(true);
    expect(dataPlatformSourceListQuerySchema.safeParse({ secret: 'yes' }).success).toBe(false);
    const unavailable = { available: false, reason: 'Requires an audited Core command.' } as const;
    const detail = {
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-28T12:00:00.000Z',
      source: { key: source.sourceKey, name: source.name, type: source.sourceType, jurisdiction: 'Tanzania', authorityLevel: source.authorityLevel, accessMethod: 'file_import', baseUrl: null, termsUrl: null, licence: 'public register', notes: null, createdAt: '2026-07-28T10:00:00.000Z', updatedAt: '2026-07-28T12:00:00.000Z' },
      rightsPolicy: { reviewStatus: 'approved', productionIngestionStatus: 'approved', defaultUsageClass: 'public_display', effectiveAt: '2026-07-28T10:00:00.000Z', expiresAt: null },
      fieldPolicies: [], permittedPurposes: ['admin_review'], retention: { storagePolicy: 'retain', rawRetentionDays: 30 }, attribution: { required: false, text: null },
      connectorConfigs: [{ key: 'tcra_import', enabled: true, scheduleExpression: null, parserVersion: '1', requestsPerMinute: 10, maxAttempts: 3, baseBackoffSeconds: 30, processingProfile: 'universal', privateConfigurationStored: true, createdAt: '2026-07-28T10:00:00.000Z', updatedAt: '2026-07-28T12:00:00.000Z' }],
      checkpoints: [], recentRuns: [], qualityMetrics: { observations: 100, targetedObservations: 90, linkedObservations: 80, openReviews: 10, failedRuns24h: 0, lastObservedAt: '2026-07-28T12:00:00.000Z' }, cost: { estimatedByCurrency: [] },
      availableActions: { dryRun: unavailable, import: unavailable, editPolicy: unavailable, editSchedule: unavailable },
    };
    expect(dataPlatformSourceDetailSchema.safeParse(detail).success).toBe(true);
    expect(dataPlatformSourceDetailSchema.safeParse({ ...detail, connectorConfigs: [{ ...detail.connectorConfigs[0], privateConfigurationStored: false, configuration: { token: 'leak' } }] }).success).toBe(false);
  });

  test('accepts read-only evidence groups and provisional evaluation semantics', () => {
    const group = {
      publicId: `evidence_group_${'1'.repeat(32)}`, representativeName: 'Example Networks Limited',
      subjectKind: 'organization', groupingKeyKind: 'regulator_record',
      source: { key: 'regulator_import', name: 'Regulator import' }, memberCount: 2, openCaseCount: 2, licenceCount: 2,
      posture: { entityRole: 'legal_entity', locality: 'unknown', productEligibility: 'review_required', confidence: 0.6, reasonCodes: ['no_explicit_country_evidence'] },
      recommendationCounts: { hold_for_review: 2 }, updatedAt: '2026-07-29T12:00:00.000Z',
      impactPreviewHref: `/data-platform/evidence-groups/evidence_group_${'1'.repeat(32)}`,
    };
    expect(evidenceGroupListSchema.safeParse({
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-29T12:00:00.000Z', groups: [group], count: 1,
      filters: { sourceKey: null, entityRole: null, localityPosture: null, query: null },
      capabilities: { read: true, groupMutations: false },
    }).success).toBe(true);
    expect(evidenceGroupListQuerySchema.safeParse({ localityPosture: 'foreign_evidence', limit: '100' }).success).toBe(true);
    expect(evidenceGroupListQuerySchema.safeParse({ mutation: 'merge' }).success).toBe(false);
    const detail = {
      contractVersion: 'admin-data-platform.v1', generatedAt: '2026-07-29T12:00:00.000Z',
      group: { publicId: group.publicId, representativeName: group.representativeName, subjectKind: 'organization', groupingKeyKind: 'regulator_record', groupingKeyDisplay: 'source:organization:regulator_record:key', groupingPolicyVersion: 'v1', source: group.source, updatedAt: group.updatedAt },
      posture: { publicId: `group_assessment_${'1'.repeat(32)}`, policyVersion: 'v1', ...group.posture, evidence: {}, assessedAt: group.updatedAt },
      impactPreview: { members: [], observationCount: 0, openReviewIds: [], licenceIds: [] },
      capabilities: { read: true, groupMutations: false },
    };
    expect(evidenceGroupDetailSchema.safeParse(detail).success).toBe(true);
    expect(evidenceGroupDetailSchema.safeParse({ ...detail, capabilities: { read: true, groupMutations: true } }).success).toBe(false);
    expect(resolutionEvaluationSetListSchema.safeParse({
      contractVersion: 'admin-data-platform.v1', generatedAt: group.updatedAt, count: 1,
      evaluationSets: [{
        publicId: `resolution_set_${'1'.repeat(32)}`, datasetKey: 'provisional_labels', version: 1,
        status: 'provisional', sourceKey: 'regulator_import', labelCount: 30,
        reviewProgress: { pendingCount: 30, confirmedCount: 0, correctedCount: 0, rejectedCount: 0, acceptedCount: 0, readyForConfirmation: false },
        createdAt: group.updatedAt, detailHref: `/data-platform/resolution-quality/resolution_set_${'1'.repeat(32)}`,
        capabilities: { read: true, reviewLabels: true, confirmSet: false },
        latestScore: {
          publicId: `resolution_score_${'1'.repeat(32)}`, shadowRunPublicId: `resolution_run_${'1'.repeat(32)}`,
          labelledCount: 30, evaluatedCount: 30, agreementCount: 12, agreementRate: 0.4,
          falseMergeCount: 1, missedMatchCount: 4, reviewRequiredCount: 13,
          scoredAt: group.updatedAt, metricSemantics: 'provisional_agreement_only',
        },
      }],
    }).success).toBe(true);
    const setDetail = {
      contractVersion: 'admin-data-platform.v1', generatedAt: group.updatedAt,
      evaluationSet: { publicId: `resolution_set_${'1'.repeat(32)}`, datasetKey: 'provisional_labels', version: 1, status: 'provisional', sourceKey: 'regulator_import', notes: null, createdBy: 'operator', createdAt: group.updatedAt, confirmedBy: null, confirmedAt: null },
      progress: { labelCount: 1, pendingCount: 1, confirmedCount: 0, correctedCount: 0, rejectedCount: 0, acceptedCount: 0, readyForConfirmation: false, reviewVersion: 'a'.repeat(64) },
      latestScore: null,
      labels: [{
        publicId: `resolution_label_${'1'.repeat(32)}`, reviewPublicId: `review_${'1'.repeat(32)}`, lane: 'exact',
        subjectSnapshot: { candidateName: 'Example', privateConnectorToken: 'must-not-cross-gateway' }, originalRecommendation: 'link_existing', rationale: 'Provisional rationale', evidenceReferences: [],
        actualRecommendation: 'hold_for_review', actualConfidence: 0.7, reviewState: 'pending', effectiveRecommendation: 'link_existing', latestReview: null, createdAt: group.updatedAt,
      }],
      capabilities: { read: true, reviewLabels: true, confirmSet: false },
    };
    const parsedDetail = resolutionEvaluationSetDetailSchema.parse(setDetail);
    expect(parsedDetail.labels[0]?.subjectSnapshot).toEqual({ candidateName: 'Example' });
    expect(resolutionLabelReviewInputSchema.safeParse({
      decision: 'confirm', reason: 'Confirmed from regulator evidence.',
      evidenceReferences: [{ kind: 'review_case', reference: `review_${'1'.repeat(32)}` }],
      expectedLatestReviewPublicId: null,
    }).success).toBe(true);
    expect(resolutionLabelReviewInputSchema.safeParse({
      decision: 'confirm', reason: 'Missing evidence reference.', evidenceReferences: [], expectedLatestReviewPublicId: null,
    }).success).toBe(false);
    expect(resolutionEvaluationSetConfirmationInputSchema.safeParse({
      reason: 'All labels were reviewed independently.', expectedReviewVersion: 'a'.repeat(64),
    }).success).toBe(true);
    expect(resolutionEvaluationSetConfirmationInputSchema.safeParse({
      reason: 'All labels were reviewed independently.', expectedReviewVersion: 'stale',
    }).success).toBe(false);
    expect(resolutionEvaluationSetConfirmationResultSchema.safeParse({
      evaluationSet: {
        publicId: `resolution_set_${'1'.repeat(32)}`, datasetKey: 'provisional_labels', version: 1,
        status: 'confirmed', confirmedBy: 'reviewer', confirmedAt: group.updatedAt,
      },
      progress: {
        labelCount: 30, pendingCount: 0, confirmedCount: 20, correctedCount: 9,
        rejectedCount: 1, acceptedCount: 29, readyForConfirmation: true, reviewVersion: 'a'.repeat(64),
      },
      latestScore: {
        publicId: `resolution_score_${'1'.repeat(32)}`, shadowRunPublicId: `resolution_run_${'1'.repeat(32)}`,
        labelledCount: 29, evaluatedCount: 29, agreementCount: 25, agreementRate: 25 / 29,
        falseMergeCount: 0, missedMatchCount: 2, reviewRequiredCount: 8,
        scoredAt: group.updatedAt, metricSemantics: 'confirmed_quality_evaluation',
      },
      capabilities: { reviewLabels: false, confirmSet: false },
    }).success).toBe(true);
  });

  test('accepts only bounded external evidence intake contracts', () => {
    const request = {
      publicId: `external_evidence_request_${'1'.repeat(32)}`,
      url: 'https://example.co.tz/about', submittedBy: 'twiga-admin:user-1',
      reason: 'Investigate this public company page', state: 'queued',
      attemptCount: 0, maxAttempts: 3, candidateCount: 0, providerKey: 'firecrawl',
      providerUsage: {}, error: null, runPublicId: null, submissionPublicId: null,
      requestedAt: '2026-08-01T12:00:00.000Z', startedAt: null, completedAt: null,
      updatedAt: '2026-08-01T12:00:00.000Z',
    };
    expect(externalEvidenceListSchema.safeParse({
      contractVersion: 'admin-data-platform.v1',
      requests: [request], count: 1, filters: { state: null }, generatedAt: '2026-08-01T12:00:00.000Z',
    }).success).toBe(true);
    expect(externalEvidenceSubmitResultSchema.safeParse({
      contractVersion: 'admin-data-platform.v1', request, created: true,
    }).success).toBe(true);
    expect(externalEvidenceRequestInputSchema.safeParse({
      url: 'https://example.co.tz/about', reason: 'Investigate this public company page', idempotencyKey: 'request-12345',
    }).success).toBe(true);
    expect(externalEvidenceListQuerySchema.safeParse({ state: 'queued', limit: '100' }).success).toBe(true);
    expect(externalEvidenceListQuerySchema.safeParse({ state: 'invented' }).success).toBe(false);
    expect(externalEvidenceListQuerySchema.safeParse({ secret: 'must-not-pass' }).success).toBe(false);
  });

  test('validates versioned acquisition settings and domain controls', () => {
    const values = {
      singlePageIntake: { enabled: true }, pageCapture: { enabled: true }, aiInterpretation: { enabled: true },
      queueDepth: { enabled: true, value: 500 }, maxAttempts: { enabled: true, value: 3 },
      queueLatencyAlertMinutes: { enabled: true, value: 10 },
      dailyFirecrawlCredits: { enabled: true, value: 1000 }, monthlyFirecrawlCredits: { enabled: true, value: 20000 },
      dailyOpenRouterTokens: { enabled: true, value: 1000000 }, monthlyOpenRouterTokens: { enabled: true, value: 20000000 },
      recurringCrawls: { enabled: false }, requireApprovedRights: { enabled: true }, respectRobots: { enabled: true },
      maxPagesPerRun: { enabled: true, value: 50 }, requestsPerMinute: { enabled: true, value: 10 },
      recrawlIntervalDays: { enabled: true, value: 30 },
    };
    expect(acquisitionSettingsUpdateSchema.safeParse({ expectedVersion: 1, reason: 'Adjust queue policy', settings: values }).success).toBe(true);
    expect(acquisitionDomainPolicyInputSchema.safeParse({
      hostname: 'example.co.tz', expectedVersion: null, reason: 'Record initial posture', enabled: true,
      singlePageEnabled: true, recurringEnabled: false, rightsStatus: 'pending', robotsStatus: 'unknown',
      requestsPerMinute: null, maxPagesPerRun: null, recrawlIntervalDays: null,
    }).success).toBe(true);
    expect(acquisitionPoliciesSchema.safeParse({
      contractVersion: 'admin-data-platform.v1',
      settings: { publicId: `acquisition_policy_${'1'.repeat(32)}`, version: 1, values, updatedBy: 'migration', updatedAt: '2026-08-01T12:00:00.000Z' },
      domains: [], queue: { queued: 0, oldestQueuedMinutes: null, alerting: false },
      capabilities: { currentPipeline: [], preparedForRecurringCollector: [] }, generatedAt: '2026-08-01T12:00:00.000Z',
    }).success).toBe(true);
  });
});
