import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { lastLoginMethod } from 'better-auth/plugins';
import DodoPayments from 'dodopayments';

import { serverEnv } from '@/env/server';
import { maindb } from '@/lib/db';
import { account, session, user, verification } from '@/lib/db/schema';
import { invalidateSessionCacheForToken } from './user-data-server';

const trustedOrigins = (serverEnv.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const googleProvider =
  serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: serverEnv.GOOGLE_CLIENT_ID,
          clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
        },
      }
    : {};

// Kept temporarily for upstream server actions that are no longer exposed in
// the Twiga UI. No provider call can succeed without an explicitly configured
// token; Twiga billing will be implemented in Twiga Core instead.
export const dodoPayments = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || 'disabled',
  environment: 'test_mode',
});

export const auth = betterAuth({
  appName: 'Twiga AI',
  baseURL: serverEnv.BETTER_AUTH_BASE_URL || 'http://localhost:3000',
  // Build-time route analysis has no runtime secrets. Runtime validation still
  // requires BETTER_AUTH_SECRET whenever SKIP_ENV_VALIDATION is not enabled.
  secret: serverEnv.BETTER_AUTH_SECRET || 'twiga-build-only-secret-do-not-use-at-runtime',
  database: drizzleAdapter(maindb, {
    provider: 'pg',
    schema: { user, session, verification, account },
  }),
  socialProviders: googleProvider,
  trustedOrigins,
  rateLimit: {
    max: 100,
    window: 60,
  },
  databaseHooks: {
    session: {
      delete: {
        before: async (sessionToDelete) => {
          invalidateSessionCacheForToken(sessionToDelete.token);
        },
      },
    },
  },
  plugins: [lastLoginMethod(), nextCookies()],
});
