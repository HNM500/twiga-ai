import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin, lastLoginMethod } from 'better-auth/plugins';

import { serverEnv } from '@/env/server';
import { maindb } from '@/lib/db';
import { account, chat, dodosubscription, payment, session, subscription, user, verification } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { invalidateSessionCacheForToken } from './user-data-server';
import { adminAccessControl, authRoles } from './admin/permissions';
import { isAuthEmailConfigured, queueAuthEmail } from './auth-email';

const trustedOrigins = (serverEnv.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const emailVerificationRequired = serverEnv.AUTH_EMAIL_VERIFICATION_REQUIRED === 'true';

if (emailVerificationRequired && !isAuthEmailConfigured()) {
  throw new Error('AUTH_EMAIL_VERIFICATION_REQUIRED needs both RESEND_API_KEY and EMAIL_FROM.');
}

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
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: emailVerificationRequired,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user: passwordUser, url }) => {
      queueAuthEmail({ kind: 'password-reset', to: passwordUser.email, name: passwordUser.name, url });
    },
    ...(emailVerificationRequired
      ? {
          customSyntheticUser: ({
            coreFields,
            additionalFields,
            id,
          }: {
            coreFields: Record<string, unknown>;
            additionalFields: Record<string, unknown>;
            id: string;
          }) => ({
            ...coreFields,
            role: 'user',
            banned: false,
            banReason: null,
            banExpires: null,
            ...additionalFields,
            id,
          }),
        }
      : {}),
  },
  emailVerification: {
    sendOnSignUp: emailVerificationRequired,
    sendOnSignIn: emailVerificationRequired,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user: verificationUser, url }) => {
      queueAuthEmail({ kind: 'verification', to: verificationUser.email, name: verificationUser.name, url });
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
    },
  },
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
  advanced: serverEnv.AUTH_COOKIE_DOMAIN
    ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: serverEnv.AUTH_COOKIE_DOMAIN,
        },
      }
    : undefined,
  rateLimit: {
    max: 100,
    window: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/request-password-reset': { window: 60, max: 3 },
      '/send-verification-email': { window: 60, max: 3 },
    },
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
  plugins: [
    admin({
      ac: adminAccessControl,
      roles: authRoles,
      defaultRole: 'user',
      adminRoles: ['super_admin'],
      defaultBanReason: 'Suspended by Twiga staff',
      bannedUserMessage: 'This account is currently suspended. Contact Twiga support if you believe this is a mistake.',
    }),
    lastLoginMethod(),
    nextCookies(),
  ],
});
