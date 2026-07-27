// Twiga launch limits. Keep server enforcement and UI copy wired to these values.
export const ACCOUNT_DAILY_MESSAGE_LIMIT = 100;
export const ANONYMOUS_WEEKLY_MESSAGE_LIMIT = 25;

export const SEARCH_LIMITS = {
  DAILY_SEARCH_LIMIT: ACCOUNT_DAILY_MESSAGE_LIMIT,
  EXTREME_SEARCH_LIMIT: 1,
} as const;

export const SNAPSHOT_NAME = 'scira-analysis:1771010549';
