import { eq, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/app/actions';
import { maindb } from '@/lib/db';
import {
  chat,
  answerFeedback,
  customInstructions,
  message,
  user as userTable,
  userMcpServer,
  userPreferences,
} from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new ChatSDKError('unauthorized:auth', 'Authentication required').toResponse();

  const [profileRows, chats, instructionRows, preferenceRows, appRows, feedbackRows] = await Promise.all([
    maindb
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
        image: userTable.image,
        createdAt: userTable.createdAt,
        updatedAt: userTable.updatedAt,
      })
      .from(userTable)
      .where(eq(userTable.id, currentUser.id)),
    maindb.select().from(chat).where(eq(chat.userId, currentUser.id)),
    maindb
      .select({ content: customInstructions.content, createdAt: customInstructions.createdAt, updatedAt: customInstructions.updatedAt })
      .from(customInstructions)
      .where(eq(customInstructions.userId, currentUser.id)),
    maindb
      .select({ preferences: userPreferences.preferences, updatedAt: userPreferences.updatedAt })
      .from(userPreferences)
      .where(eq(userPreferences.userId, currentUser.id)),
    maindb
      .select({
        id: userMcpServer.id,
        name: userMcpServer.name,
        transportType: userMcpServer.transportType,
        url: userMcpServer.url,
        authType: userMcpServer.authType,
        oauthScopes: userMcpServer.oauthScopes,
        isEnabled: userMcpServer.isEnabled,
        disabledTools: userMcpServer.disabledTools,
        oauthConnectedAt: userMcpServer.oauthConnectedAt,
        lastTestedAt: userMcpServer.lastTestedAt,
        createdAt: userMcpServer.createdAt,
        updatedAt: userMcpServer.updatedAt,
      })
      .from(userMcpServer)
      .where(eq(userMcpServer.userId, currentUser.id)),
    maindb.select().from(answerFeedback).where(eq(answerFeedback.userId, currentUser.id)),
  ]);

  const chatIds = chats.map((item) => item.id);
  const messages =
    chatIds.length > 0
      ? await maindb.select().from(message).where(inArray(message.chatId, chatIds))
      : [];

  const exportedAt = new Date();
  const body = {
    format: 'twiga-account-export-v1',
    exportedAt: exportedAt.toISOString(),
    profile: profileRows[0] ?? null,
    chats,
    messages,
    customInstructions: instructionRows[0] ?? null,
    preferences: preferenceRows[0]?.preferences ?? {},
    apps: appRows,
    answerFeedback: feedbackRows,
    notes: [
      'Authentication tokens, connected-app credentials and OAuth tokens are intentionally excluded.',
      'External providers may retain data according to the disclosures in Twiga’s Privacy Policy.',
    ],
  };

  const date = exportedAt.toISOString().slice(0, 10);
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="twiga-data-${date}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
