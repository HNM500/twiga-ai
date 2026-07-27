const isEnabled = (value: string | undefined) => value === 'true';

/**
 * Build-time product gates for capabilities that have an approved launch path.
 * Features listed as P2 in the product audit remain hard-disabled until their
 * storage, privacy, cost, and support prerequisites are deliberately completed.
 */
export const TWIGA_FEATURES = Object.freeze({
  googleAuth: isEnabled(process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED),
  apps: isEnabled(process.env.NEXT_PUBLIC_MCP_ENABLED),
  youtube: isEnabled(process.env.NEXT_PUBLIC_YOUTUBE_ENABLED),
  uploads: false,
  voiceInput: false,
  memory: false,
  consumerPricing: false,
});
