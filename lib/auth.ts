import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { lastLoginMethod } from 'better-auth/plugins';

import { serverEnv } from '@/env/server';
import { maindb } from '@/lib/db';
import { account, chat, dodosubscription, payment, session, subscription, user, verification } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (userToDelete) => {
        await maindb.transaction(async (tx) => {
          await tx.delete(payment).where(eq(payment.userId, userToDelete.id));
          await tx.delete(dodosubscription).where(eq(dodosubscription.userId, userToDelete.id));
          await tx.delete(subscription).where(eq(subscription.userId, userToDelete.id));
          await tx.delete(chat).where(eq(chat.userId, userToDelete.id));
        });
      },
    },
  },
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
