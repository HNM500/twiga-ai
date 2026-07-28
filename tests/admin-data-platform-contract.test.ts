import { describe, expect, test } from 'bun:test';
import { dataPlatformOverviewSchema } from '@/lib/admin/data-platform-contract';

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

describe('Data Platform gateway contract', () => {
  test('accepts the current versioned Core overview', () => {
    expect(dataPlatformOverviewSchema.safeParse(validOverview).success).toBe(true);
  });

  test('fails closed when Core changes the version or health vocabulary', () => {
    expect(dataPlatformOverviewSchema.safeParse({ ...validOverview, contractVersion: 'admin-data-platform.v2' }).success).toBe(false);
    expect(dataPlatformOverviewSchema.safeParse({ ...validOverview, health: { ...validOverview.health, state: 'fine' } }).success).toBe(false);
  });
});
