// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const requiredString = z.string().trim().min(1);
const optionalString = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? '');

/**
 * Twiga validates only the services required by the enabled MVP surface.
 * Optional upstream integrations remain typed so dormant modules can compile,
 * but they do not force us to provision unused providers.
 */
export const serverEnv = createEnv({
  server: {
    // Twiga MVP core
    OPENROUTER_API_KEY: requiredString,
    OPENROUTER_DEFAULT_MODEL: optionalString,
    OPENROUTER_SEARCH_MODEL: optionalString,
    OPENROUTER_ROUTER_MODEL: optionalString,
    OPENROUTER_REASONING_MODEL: optionalString,
    SOURCE_REVISION: optionalString,
    DATABASE_URL: requiredString,
    BETTER_AUTH_SECRET: requiredString,
    BETTER_AUTH_BASE_URL: optionalString,
    ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),
    EXA_API_KEY: requiredString,

    // Planned authentication and infrastructure
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: optionalString,
    REDIS_URL: optionalString,
    READ_DB_1: optionalString,
    READ_DB_2: optionalString,
    FIRECRAWL_API_KEY: optionalString,
    APIFY_API_TOKEN: optionalString,
    CRON_SECRET: optionalString,
    MCP_CREDENTIALS_ENCRYPTION_KEY: optionalString,

    // Dormant upstream integrations. Keep these optional until explicitly enabled.
    XAI_API_KEY: optionalString,
    OPENAI_API_KEY: optionalString,
    ANTHROPIC_API_KEY: optionalString,
    GROQ_API_KEY: optionalString,
    GOOGLE_GENERATIVE_AI_API_KEY: optionalString,
    DAYTONA_API_KEY: optionalString,
    GITHUB_CLIENT_ID: optionalString,
    GITHUB_CLIENT_SECRET: optionalString,
    TWITTER_CLIENT_ID: optionalString,
    TWITTER_CLIENT_SECRET: optionalString,
    ELEVENLABS_API_KEY: optionalString,
    TAVILY_API_KEY: optionalString,
    VALYU_API_KEY: optionalString,
    TMDB_API_KEY: optionalString,
    YT_ENDPOINT: optionalString,
    NOTTE_API_KEY: optionalString,
    PARALLEL_API_KEY: optionalString,
    OPENWEATHER_API_KEY: optionalString,
    GOOGLE_MAPS_API_KEY: optionalString,
    AMADEUS_API_KEY: optionalString,
    AMADEUS_API_SECRET: optionalString,
    BLOB_READ_WRITE_TOKEN: optionalString,
    SMITHERY_API_KEY: optionalString,
    COINGECKO_API_KEY: optionalString,
    SUPADATA_API_KEY: optionalString,
    SUPERMEMORY_API_KEY: optionalString,
    SPOTIFY_CLIENT_ID: optionalString,
    SPOTIFY_CLIENT_SECRET: optionalString,
    MCP_OAUTH_CALLBACK_ORIGIN: z.string().url().optional(),
    GITHUB_MCP_CLIENT_ID: optionalString,
    GITHUB_MCP_CLIENT_SECRET: optionalString,
    BOX_MCP_CLIENT_ID: optionalString,
    BOX_MCP_CLIENT_SECRET: optionalString,
    DROPBOX_MCP_CLIENT_ID: optionalString,
    DROPBOX_MCP_CLIENT_SECRET: optionalString,
    SLACK_MCP_CLIENT_ID: optionalString,
    SLACK_MCP_CLIENT_SECRET: optionalString,
    HUBSPOT_MCP_CLIENT_ID: optionalString,
    HUBSPOT_MCP_CLIENT_SECRET: optionalString,
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
