// app/actions.ts
'use server';

import { geolocation } from '@vercel/functions';
import { serverEnv } from '@/env/server';
import { UIMessage, generateText, Output } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { getUser } from '@/lib/auth-utils';
import { hasVisionSupport, scira } from '@/ai/providers';
import {
  getChatsByUserId,
  getRecentChatsByUserId,
  deleteChatById,
  updateChatVisibilityById,
  getChatById,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatTitleById,
  updateChatPinnedById,
  getExtremeSearchCount,
  getMessageCountAndExtremeSearchByUserId,
  incrementMessageUsage,
  incrementAnthropicUsage,
  incrementGoogleUsage,
  getMessageCount,
  getAnthropicUsageCount,
  getGoogleUsageCount,
  getAgentModeRequestCountForCurrentMonth,
  getHistoricalUsageData,
  getCustomInstructionsByUserId,
  createCustomInstructions,
  updateCustomInstructions,
  deleteCustomInstructions,
  upsertUserPreferences,
  getChatWithUserById,
} from '@/lib/db/queries';
import { extractChatPreview } from '@/lib/search-utils';
import { db, maindb } from '@/lib/db';
import { chat, message, buildSession, type User } from '@/lib/db/schema';
import { eq, desc, ilike, and, asc, inArray, notExists } from 'drizzle-orm';
import { GroqProviderOptions, groq } from '@ai-sdk/groq';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { CharacterAlignmentResponseModel } from '@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel';
import {
  usageCountCache,
  createMessageCountKey,
  createExtremeCountKey,
  createAnthropicCountKey,
  createGoogleCountKey,
  createAgentModeCountKey,
} from '@/lib/performance-cache';
import {
  getComprehensiveUserData,
  getLightweightUserAuth,
  getCachedUserPreferencesByUserId,
  clearUserPreferencesCache,
} from '@/lib/user-data-server';
import { jsonrepair } from 'jsonrepair';
import { headers } from 'next/headers';
import { v7 as uuidv7 } from 'uuid';
import { saveChat, saveMessages } from '@/lib/db/queries';
import { all, allSettled } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { getGroupConfig as getSearchGroupConfig } from '@/lib/search/group-config';
import { GoogleGenerativeAIProviderOptions, GoogleLanguageModelOptions } from '@ai-sdk/google';
import { GatewayProviderOptions } from '@ai-sdk/gateway';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';

// Server action to get the current user with Pro status - UNIFIED VERSION
export async function getCurrentUser() {
  'use server';

  return await getComprehensiveUserData();
}

// Lightweight auth check for fast authentication validation
export async function getLightweightUser() {
  'use server';

  return await getLightweightUserAuth();
}

// Fetch chat meta with user details (server action for client use via React Query)
export async function getChatMeta(chatId: string, viewerUserId?: string) {
  'use server';

  if (!chatId) return null;

  try {
    const chat = await getChatWithUserById({ id: chatId });

    if (!chat) return null;

    const isOwner = viewerUserId ? chat.userId === viewerUserId : false;

    return {
      id: chat.id,
      title: chat.title,
      visibility: chat.visibility as 'public' | 'private',
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      user: {
        id: chat.userId,
        name: chat.userName,
        email: chat.userEmail,
        image: chat.userImage,
      },
      isOwner,
    } as const;
  } catch (error) {
    console.error('Error in getChatMeta:', error);
    return null;
  }
}

// Get user's country code from geolocation
export async function getUserCountryCode() {
  'use server';

  try {
    const headersList = await headers();

    const request = {
      headers: headersList,
    };

    const locationData = geolocation(request);

    return locationData.country || null;
  } catch (error) {
    console.error('Error getting geolocation:', error);
    return null;
  }
}

export async function suggestQuestions(history: any[]) {
  'use server';

  console.log(history);

  const { output } = await generateText({
    model: scira.languageModel('scira-follow-up'),
    providerOptions: {
      google: {
        structuredOutputs: true,
      } satisfies GoogleGenerativeAIProviderOptions,
    },
    system: `You are a search engine follow up query/questions generator. You MUST create between 3 and 5 questions for the search engine based on the conversation history.

### Question Generation Guidelines:
- Create 3-5 questions that are open-ended and encourage further discussion
- Questions must be concise (5-10 words each) but specific and contextually relevant
- Each question must contain specific nouns, entities, or clear context markers
- NEVER use pronouns (he, she, him, his, her, etc.) - always use proper nouns from the context
- Questions must be related to tools available in the system
- Questions should flow naturally from previous conversation
- You are here to generate questions for the search engine not to use tools or run tools!!

### Tool-Specific Question Types:
- Web search: Focus on factual information, current events, or general knowledge
- Academic: Focus on scholarly topics, research questions, or educational content
- YouTube: Focus on tutorials, how-to questions, or content discovery
- Social media (X/Twitter): Focus on trends, opinions, or social conversations
- Code/Analysis: Focus on programming, data analysis, or technical problem-solving
- Weather: Redirect to news, sports, or other non-weather topics
- Location: Focus on culture, history, landmarks, or local information
- Finance: Focus on market analysis, investment strategies, or economic topics

### Context Transformation Rules:
- For weather conversations → Generate questions about news, sports, or other non-weather topics
- For programming conversations → Generate questions about algorithms, data structures, or code optimization
- For location-based conversations → Generate questions about culture, history, or local attractions
- For mathematical queries → Generate questions about related applications or theoretical concepts
- For current events → Generate questions that explore implications, background, or related topics

### Formatting Requirements:
- No bullet points, numbering, or prefixes
- No quotation marks around questions
- Each question must be grammatically complete
- Each question must end with a question mark
- Questions must be diverse and not redundant
- Do not include instructions or meta-commentary in the questions

JSON Output Schema:
{
  "questions": [
    "question1 (string)",
    "question2 (string)",
    "question3 (string)"
  ]
}
`,
    messages: history,
    output: Output.object({
      schema: z.object({
        questions: z
          .array(z.string().max(150))
          .describe('The generated questions based on the message history.')
          .min(3)
          .max(5),
      }),
    }),
  });

  return {
    questions: output.questions,
  };
}

export async function checkImageModeration(images: string[]) {
  const messages: ModelMessage[] = images.map((image) => ({
    role: 'user',
    content: [{ type: 'image', image: image }],
  }));

  const { text } = await generateText({
    model: groq('meta-llama/llama-guard-4-12b'),
    messages,
    providerOptions: {
      groq: {
        service_tier: 'flex',
      },
    },
  });
  return text;
}

export async function generateTitleFromUserMessage({ message }: { message: UIMessage }) {
  const startTime = Date.now();
  const firstTextPart = message.parts.find((part) => part.type === 'text');
  const prompt = JSON.stringify(firstTextPart && firstTextPart.type === 'text' ? firstTextPart.text : '');
  console.log('Prompt: ', prompt);
  const { text: title } = await generateText({
    model: scira.languageModel('scira-name'),
    system: `You are an expert title generator. You are given a message and you need to generate a short title based on it.

    - you will generate a short 3-4 words title based on the first message a user begins a conversation with
    - the title should creative and unique
    - do not write anything other than the title
    - do not use quotes or colons
    - no markdown formatting allowed
    - keep plain text only
    - not more than 4 words in the title
    - do not use any other text other than the title`,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    providerOptions: {
      openai: {
        reasoningEffort: 'minimal',
        reasoningSummary: null,
        textVerbosity: 'low',
        store: false,
        include: ['reasoning.encrypted_content'],
      } satisfies OpenAIResponsesProviderOptions,
      gateway: {
        only: ['vertex', 'google'],
        order: ['vertex', 'google'],
      } satisfies GatewayProviderOptions,
      google: {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
      vertex: {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      } satisfies GoogleLanguageModelOptions,
    },
    onFinish: (output) => {
      console.log('Title generated: ', output.text);
      console.log('Model Used: ', output.model.modelId);
      const durationMs = Date.now() - startTime;
      console.log(`⏱️ [USAGE] generateTitleFromUserMessage: Model took ${durationMs}ms`);
    },
  });

  console.log('Title: ', title);

  const durationMs = Date.now() - startTime;
  console.log(`⏱️ [USAGE] generateTitleFromUserMessage: Model took ${durationMs}ms`);

  return title;
}

export async function enhancePrompt(raw: string) {
  try {
    const auth = await getLightweightUserAuth();

    if (!auth?.isProUser) {
      return { success: false, error: 'Pro subscription required' };
    }

    const system = `You are an expert prompt engineer. Rewrite and enhance the user's prompt.

Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}. Treat this as the authoritative current date/time.

Temporal awareness:
- Interpret relative time expressions (e.g., "today", "last week", "current", "up-to-date") relative to the date stated above.
- Do not include meta-references like "date above", "current date", or similar in the output.
- Only include an explicit calendar date when the user's prompt requests or clearly implies a time boundary; otherwise, keep timing implicit and avoid adding extra date text.
- Do not speculate about future events beyond the date stated above.

Guidelines (MANDATORY):
- Preserve the user's original intent, constraints, and point of view and voice.
- Make the prompt specific, unambiguous, and actionable.
- Add missing context when implied: entities, timeframe, location, and output format/constraints.
- Remove fluff and vague language; prefer proper nouns over pronouns.
- Keep it concise (add at most 1–2 sentences of necessary context) but information-dense.
- Do NOT ask follow-up questions.
- Do NOT answer the user's request; your job is only to improve the prompt.
- Do NOT introduce new facts not implied by the user.

Output requirements:
- Return ONLY the improved prompt text, in plain text.
- No quotes, no commentary, no markdown, and no preface.`;

    const { text } = await generateText({
      model: scira.languageModel('scira-enhance'),
      temperature: 0.6,
      topP: 0.95,
      maxOutputTokens: 1024,
      system,
      prompt: raw,
    });

    console.log('Enhanced text: ', text);

    return { success: true, enhanced: text.trim() };
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return { success: false, error: 'Failed to enhance prompt' };
  }
}

export interface GenerateSpeechResult {
  audio: string;
  alignment: CharacterAlignmentResponseModel | null;
  normalizedAlignment: CharacterAlignmentResponseModel | null;
}

export async function generateSpeech(text: string): Promise<GenerateSpeechResult> {
  const client = new ElevenLabsClient({
    apiKey: serverEnv.ELEVENLABS_API_KEY,
  });

  const result = await client.textToSpeech.convertWithTimestamps('90ipbRoKi4CpHXvKVtl0', {
    text,
    modelId: 'eleven_v3',
  });

  return {
    audio: `data:audio/mp3;base64,${result.audioBase64}`,
    alignment: result.alignment ?? null,
    normalizedAlignment: result.normalizedAlignment ?? null,
  };
}

export async function getGroupConfig(...args: Parameters<typeof getSearchGroupConfig>) {
  'use server';
  return getSearchGroupConfig(...args);
}

// Lightweight function for sidebar recent chats - minimal payload, no cursor pagination
export async function getRecentChats(
  userId: string,
  limit: number = 8,
): Promise<{
  chats: Array<{
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    isPinned: boolean;
    visibility: 'public' | 'private';
  }>;
  hasMore: boolean;
}> {
  'use server';

  if (!userId) return { chats: [], hasMore: false };

  try {
    return await getRecentChatsByUserId({ userId, limit });
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    return { chats: [], hasMore: false };
  }
}

// Add functions to fetch user chats
export async function getUserChats(
  userId: string,
  limit: number = 20,
  startingAfter?: string,
  endingBefore?: string,
): Promise<{ chats: any[]; hasMore: boolean }> {
  'use server';

  if (!userId) return { chats: [], hasMore: false };

  try {
    return await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: startingAfter || null,
      endingBefore: endingBefore || null,
    });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    return { chats: [], hasMore: false };
  }
}

// Add function to load more chats for infinite scroll
// Accepts optional cursorDate to skip the extra DB lookup for the cursor chat's updatedAt
export async function loadMoreChats(
  userId: string,
  lastChatId: string,
  limit: number = 20,
  cursorDate?: string,
  cursorIsPinned?: boolean,
): Promise<{ chats: any[]; hasMore: boolean }> {
  'use server';

  if (!userId || !lastChatId) return { chats: [], hasMore: false };

  try {
    return await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: null,
      endingBefore: lastChatId,
      cursorDate: cursorDate || null,
      cursorIsPinned: cursorIsPinned ?? null,
    });
  } catch (error) {
    console.error('Error loading more chats:', error);
    return { chats: [], hasMore: false };
  }
}

// Add function to delete a chat
export async function deleteChat(chatId: string) {
  'use server';

  if (!chatId) return null;

  try {
    return await deleteChatById({ id: chatId });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return null;
  }
}

// Add function to bulk delete chats
export async function bulkDeleteChats(chatIds: string[]) {
  'use server';

  if (!chatIds || chatIds.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    const taskEntries = chatIds.map((id) => [`chat:${id}`, async () => deleteChatById({ id })] as const);

    const settled = await allSettled(Object.fromEntries(taskEntries), getBetterAllOptions());

    const settledValues = Object.values(settled);
    const anyRejected = settledValues.some((r) => r.status === 'rejected');
    if (anyRejected) {
      // Preserve previous behavior: bubble up failure
      throw new Error('Failed to delete chats');
    }

    const deletedCount = settledValues.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error bulk deleting chats:', error);
    throw new Error('Failed to delete chats');
  }
}

// Add function to update chat visibility
export async function updateChatVisibility(chatId: string, visibility: 'private' | 'public') {
  'use server';

  console.log('🔄 updateChatVisibility called with:', { chatId, visibility });

  if (!chatId) {
    console.error('❌ updateChatVisibility: No chatId provided');
    throw new Error('Chat ID is required');
  }

  try {
    console.log('📡 Calling updateChatVisibilityById with:', { chatId, visibility });
    const result = await updateChatVisibilityById({ chatId, visibility });
    console.log('✅ updateChatVisibilityById successful, result:', result);

    // Return a serializable plain object instead of raw database result
    return {
      success: true,
      chatId,
      visibility,
      rowCount: result?.rowCount || 0,
    };
  } catch (error) {
    console.error('❌ Error in updateChatVisibility:', {
      chatId,
      visibility,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function updateChatPinned(chatId: string, isPinned: boolean) {
  'use server';

  if (!chatId) return null;

  try {
    return await updateChatPinnedById({ chatId, isPinned });
  } catch (error) {
    console.error('Error updating chat pinned state:', error);
    return null;
  }
}

// Add function to get chat info
export async function getChatInfo(chatId: string) {
  'use server';

  if (!chatId) return null;

  try {
    return await getChatById({ id: chatId });
  } catch (error) {
    console.error('Error getting chat info:', error);
    return null;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  'use server';
  try {
    const [message] = await getMessageById({ id });
    console.log('Message: ', message);

    if (!message) {
      console.error(`No message found with id: ${id}`);
      return;
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });

    console.log(`Successfully deleted trailing messages after message ID: ${id}`);
  } catch (error) {
    console.error(`Error deleting trailing messages: ${error}`);
    throw error; // Re-throw to allow caller to handle
  }
}

// Add function to update chat title
export async function updateChatTitle(chatId: string, title: string) {
  'use server';

  if (!chatId || !title.trim()) return null;

  try {
    return await updateChatTitleById({ chatId, title: title.trim() });
  } catch (error) {
    console.error('Error updating chat title:', error);
    return null;
  }
}

export async function forkChat(
  originalChatId: string,
): Promise<{ success: boolean; newChatId?: string; error?: string }> {
  'use server';

  if (!originalChatId) {
    return { success: false, error: 'Chat ID is required' };
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    const originalChat = await getChatById({ id: originalChatId });
    if (!originalChat || originalChat.visibility !== 'public') {
      return { success: false, error: 'Chat is not available for forking' };
    }

    const messages = await db.query.message.findMany({
      where: eq(message.chatId, originalChatId),
      orderBy: (fields, { asc }) => [asc(fields.createdAt), asc(fields.id)],
    });

    const newChatId = uuidv7();
    const newChatTitle = originalChat.title ? `Fork of ${originalChat.title}` : 'Forked Chat';

    const messagesToSave = messages.map((messageItem) => ({
      chatId: newChatId,
      id: uuidv7(),
      role: messageItem.role,
      parts: messageItem.parts,
      attachments: messageItem.attachments ?? [],
      createdAt: messageItem.createdAt,
      model: messageItem.model ?? null,
      inputTokens: messageItem.inputTokens ?? null,
      outputTokens: messageItem.outputTokens ?? null,
      totalTokens: messageItem.totalTokens ?? null,
      completionTime: messageItem.completionTime ?? null,
    }));

    await all(
      {
        async saveMessages() {
          if (messagesToSave.length > 0) {
            await saveMessages({ messages: messagesToSave });
          }
          return true;
        },
        async saveChat() {
          await saveChat({
            id: newChatId,
            userId: currentUser.id,
            title: newChatTitle,
            visibility: 'private',
          });
          return true;
        },
      },
      getBetterAllOptions(),
    );

    return { success: true, newChatId };
  } catch (error) {
    console.error('Error forking chat:', error);
    return { success: false, error: 'Failed to fork chat' };
  }
}

// Branch out a chat - create a new chat with the current user and assistant message pair
export async function branchOutChat({
  userMessage,
  assistantMessage,
}: {
  userMessage: UIMessage;
  assistantMessage: UIMessage;
}) {
  'use server';

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    // Generate new chat ID and message IDs
    const newChatId = uuidv7();
    const newUserMessageId = uuidv7();
    const newAssistantMessageId = uuidv7();

    // Start title generation early (can run while we prepare messages)
    const chatTitlePromise = generateTitleFromUserMessage({ message: userMessage });

    // Prepare messages for saving
    const messagesToSave = [
      {
        chatId: newChatId,
        id: newUserMessageId,
        role: 'user' as const,
        parts: userMessage.parts,
        attachments: (userMessage as any).experimental_attachments ?? [],
        createdAt: new Date(),
        model: (userMessage as any).metadata?.model || null,
        inputTokens: (userMessage as any).metadata?.inputTokens ?? null,
        outputTokens: null,
        totalTokens: null,
        completionTime: null,
      },
      {
        chatId: newChatId,
        id: newAssistantMessageId,
        role: 'assistant' as const,
        parts: assistantMessage.parts,
        attachments: [],
        createdAt: new Date(),
        model: (assistantMessage as any).metadata?.model || null,
        inputTokens: (assistantMessage as any).metadata?.inputTokens ?? null,
        outputTokens: (assistantMessage as any).metadata?.outputTokens ?? null,
        totalTokens: (assistantMessage as any).metadata?.totalTokens ?? null,
        completionTime: (assistantMessage as any).metadata?.completionTime ?? null,
      },
    ];

    // Create chat first (messages have foreign key to chat), then save messages
    await all(
      {
        chatTitle: async function () {
          return chatTitlePromise;
        },
        saveChat: async function () {
          const chatTitle = await this.$.chatTitle;
          await saveChat({
            id: newChatId,
            userId: currentUser.id,
            title: chatTitle,
            visibility: 'private',
          });
          return true;
        },
        saveMessages: async function () {
          await this.$.saveChat; // Wait for chat to be created first (foreign key constraint)
          await saveMessages({ messages: messagesToSave });
          return true;
        },
      },
      getBetterAllOptions(),
    );

    return { success: true, chatId: newChatId };
  } catch (error) {
    console.error('Error branching out chat:', error);
    return { success: false, error: 'Failed to branch out chat' };
  }
}

export async function getUserMessageCount(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    // Check cache first
    const cacheKey = createMessageCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getUserMessageCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getMessageCount({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getUserMessageCount: DB usage lookup took ${durationMs}ms`);

    // Cache the result
    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting user message count:', error);
    return { count: 0, error: 'Failed to get message count' };
  }
}

export async function getUserExtremeSearchCount(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    // Check cache first
    const cacheKey = createExtremeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getUserExtremeSearchCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getExtremeSearchCount({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getUserExtremeSearchCount: DB usage lookup took ${durationMs}ms`);

    // Cache the result
    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting user extreme search count:', error);
    return { count: 0, error: 'Failed to get extreme search count' };
  }
}

export async function incrementUserMessageCount() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await incrementMessageUsage({
      userId: user.id,
    });

    // Invalidate cache
    const cacheKey = createMessageCountKey(user.id);
    usageCountCache.delete(cacheKey);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error incrementing user message count:', error);
    return { success: false, error: 'Failed to increment message count' };
  }
}

export async function getExtremeSearchUsageCount(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    // Check cache first
    const cacheKey = createExtremeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getExtremeSearchUsageCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getExtremeSearchCount({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getExtremeSearchUsageCount: DB usage lookup took ${durationMs}ms`);

    // Cache the result
    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting extreme search usage count:', error);
    return { count: 0, error: 'Failed to get extreme search count' };
  }
}

/**
 * Get message count by userId directly - avoids getUser() overhead.
 * Uses the same cache as getUserMessageCount for consistency.
 */
export async function getMessageCountByUserId(userId: string) {
  const cacheKey = createMessageCountKey(userId);
  const cached = usageCountCache.get(cacheKey);
  if (cached !== null) return { count: cached, error: null };

  const count = await getMessageCount({ userId });
  usageCountCache.set(cacheKey, count);
  return { count, error: null };
}

/**
 * Get extreme search count by userId directly - avoids getUser() overhead.
 * Uses the same cache as getExtremeSearchUsageCount for consistency.
 */
export async function getExtremeSearchCountByUserId(userId: string) {
  const cacheKey = createExtremeCountKey(userId);
  const cached = usageCountCache.get(cacheKey);
  if (cached !== null) return { count: cached, error: null };

  const count = await getExtremeSearchCount({ userId });
  usageCountCache.set(cacheKey, count);
  return { count, error: null };
}

/**
 * Get anthropic usage count by userId directly - avoids getUser() overhead.
 * Uses the same cache strategy as other usage counters for consistency.
 */
export async function getAnthropicUsageCountByUserId(userId: string) {
  const cacheKey = createAnthropicCountKey(userId);
  const cached = usageCountCache.get(cacheKey);
  if (cached !== null) return { count: cached, error: null };

  const count = await getAnthropicUsageCount({ userId });
  usageCountCache.set(cacheKey, count);
  return { count, error: null };
}

export async function getAnthropicUsageCountAction(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createAnthropicCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getAnthropicUsageCountAction: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getAnthropicUsageCount({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getAnthropicUsageCountAction: DB usage lookup took ${durationMs}ms`);

    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting anthropic usage count:', error);
    return { count: 0, error: 'Failed to get anthropic usage count' };
  }
}

export async function getAgentModeUsageCountAction(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createAgentModeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getAgentModeUsageCountAction: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getAgentModeRequestCountForCurrentMonth({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getAgentModeUsageCountAction: DB usage lookup took ${durationMs}ms`);

    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting agent mode usage count:', error);
    return { count: 0, error: 'Failed to get agent mode usage count' };
  }
}

export async function incrementAnthropicUsageAction(model?: string | null) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await incrementAnthropicUsage({
      userId: user.id,
      model,
    });

    const cacheKey = createAnthropicCountKey(user.id);
    usageCountCache.delete(cacheKey);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error incrementing anthropic usage count:', error);
    return { success: false, error: 'Failed to increment anthropic usage count' };
  }
}

export async function getGoogleUsageCountByUserId(userId: string) {
  const cacheKey = createGoogleCountKey(userId);
  const cached = usageCountCache.get(cacheKey);
  if (cached !== null) return { count: cached, error: null };

  const count = await getGoogleUsageCount({ userId });
  usageCountCache.set(cacheKey, count);
  return { count, error: null };
}

export async function getGoogleUsageCountAction(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createGoogleCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getGoogleUsageCountAction: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getGoogleUsageCount({ userId: user.id });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getGoogleUsageCountAction: DB usage lookup took ${durationMs}ms`);

    usageCountCache.set(cacheKey, count);
    return { count, error: null };
  } catch (error) {
    console.error('Error getting google usage count:', error);
    return { count: 0, error: 'Failed to get google usage count' };
  }
}

export async function incrementGoogleUsageAction(model?: string | null) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await incrementGoogleUsage({ userId: user.id, model });

    const cacheKey = createGoogleCountKey(user.id);
    usageCountCache.delete(cacheKey);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error incrementing google usage count:', error);
    return { success: false, error: 'Failed to increment google usage count' };
  }
}

/**
 * Get message count, extreme search count, and anthropic usage count in one parallel DB round-trip.
 * Updates usage caches. Use in search critical-checks to run usage fetch
 * in parallel with chat validation instead of after it.
 */
export async function getMessageCountAndExtremeSearchByUserIdAction(userId: string): Promise<{
  messageCountResult: { count: number; error: null } | { count: undefined; error: Error };
  extremeSearchUsage: { count: number; error: null } | { count: undefined; error: Error };
  anthropicUsageResult: { count: number; error: null } | { count: undefined; error: Error };
}> {
  const messageCacheKey = createMessageCountKey(userId);
  const extremeCacheKey = createExtremeCountKey(userId);
  const anthropicCacheKey = createAnthropicCountKey(userId);

  const messageCached = usageCountCache.get(messageCacheKey);
  const extremeCached = usageCountCache.get(extremeCacheKey);
  const anthropicCached = usageCountCache.get(anthropicCacheKey);

  if (messageCached !== null && extremeCached !== null && anthropicCached !== null) {
    return {
      messageCountResult: { count: messageCached, error: null },
      extremeSearchUsage: { count: extremeCached, error: null },
      anthropicUsageResult: { count: anthropicCached, error: null },
    };
  }

  try {
    const { messageCount, extremeSearchCount, anthropicCount } = await getMessageCountAndExtremeSearchByUserId({
      userId,
    });

    if (messageCached === null) usageCountCache.set(messageCacheKey, messageCount);
    if (extremeCached === null) usageCountCache.set(extremeCacheKey, extremeSearchCount);
    if (anthropicCached === null) usageCountCache.set(anthropicCacheKey, anthropicCount);

    return {
      messageCountResult: { count: messageCount, error: null },
      extremeSearchUsage: { count: extremeSearchCount, error: null },
      anthropicUsageResult: { count: anthropicCount, error: null },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to verify usage limits');
    return {
      messageCountResult: { count: undefined, error },
      extremeSearchUsage: { count: undefined, error },
      anthropicUsageResult: { count: undefined, error },
    };
  }
}

export async function getHistoricalUsage(providedUser?: User | null, days: number = 30) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return [];
    }

    // Convert days to months for the database query (approximately 30 days per month)
    const months = Math.ceil(days / 30);
    const historicalData = await getHistoricalUsageData({ userId: user.id, months });

    // Use the exact number of days requested
    const totalDays = days;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (totalDays - 1)); // -1 to include today

    // Create a map of existing data for quick lookup
    const dataMap = new Map<string, number>();
    historicalData.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      dataMap.set(dateKey, record.messageCount || 0);
    });

    // Generate complete dataset for all days
    const completeData = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];

      const count = dataMap.get(dateKey) || 0;
      let level: 0 | 1 | 2 | 3 | 4;

      // Define usage levels based on message count
      if (count === 0) level = 0;
      else if (count <= 3) level = 1;
      else if (count <= 7) level = 2;
      else if (count <= 12) level = 3;
      else level = 4;

      completeData.push({
        date: dateKey,
        count,
        level,
      });
    }

    return completeData;
  } catch (error) {
    console.error('Error getting historical usage:', error);
    return [];
  }
}

// Custom Instructions Server Actions
export async function getCustomInstructions(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return null;
    }

    const instructions = await getCustomInstructionsByUserId({ userId: user.id });
    return instructions;
  } catch (error) {
    console.error('Error getting custom instructions:', error);
    return null;
  }
}

export async function saveCustomInstructions(content: string) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!content.trim()) {
      return { success: false, error: 'Content cannot be empty' };
    }

    // Check if instructions already exist
    const existingInstructions = await getCustomInstructionsByUserId({ userId: user.id });

    let result;
    if (existingInstructions) {
      result = await updateCustomInstructions({ userId: user.id, content: content.trim() });
    } else {
      result = await createCustomInstructions({ userId: user.id, content: content.trim() });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving custom instructions:', error);
    return { success: false, error: 'Failed to save custom instructions' };
  }
}

export async function deleteCustomInstructionsAction() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const result = await deleteCustomInstructions({ userId: user.id });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting custom instructions:', error);
    return { success: false, error: 'Failed to delete custom instructions' };
  }
}

// User Preferences Actions
export async function getUserPreferences(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return null;
    }

    const preferences = await getCachedUserPreferencesByUserId(user.id);
    return preferences;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

export async function saveUserPreferences(
  preferences: Partial<{
    'scira-search-provider'?: 'exa' | 'parallel' | 'firecrawl';
    'scira-extreme-search-model'?:
      | 'scira-ext-1'
      | 'scira-ext-2'
      | 'scira-ext-4'
      | 'scira-ext-5'
      | 'scira-ext-6'
      | 'scira-ext-7'
      | 'scira-ext-8';
    'scira-group-order'?: string[];
    'scira-model-order-global'?: string[];
    'scira-blur-personal-info'?: boolean;
    'scira-custom-instructions-enabled'?: boolean;
    'scira-scroll-to-latest-on-open'?: boolean;
    'scira-location-metadata-enabled'?: boolean;
    'scira-auto-router-enabled'?: boolean;
    'scira-auto-router-config'?: {
      routes: Array<{
        name: string;
        description: string;
        model: string;
      }>;
    };
  }>,
) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const result = await upsertUserPreferences({ userId: user.id, preferences });

    // Clear cache after update
    clearUserPreferencesCache(user.id);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return { success: false, error: 'Failed to save user preferences' };
  }
}

export async function routeWithAutoRouter({
  query,
  routes,
  hasImages = false,
}: {
  query: string;
  routes: Array<{ name: string; description: string; model: string }>;
  hasImages?: boolean;
}) {
  'use server';

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.isProUser) {
      return { success: false, error: 'pro_required' };
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { success: false, error: 'Query cannot be empty' };
    }

    const sanitizedRoutes = routes
      .map((route) => ({
        name: route.name.trim(),
        description: route.description.trim(),
        model: route.model.trim(),
      }))
      .filter((route) => route.name && route.description && route.model);

    if (!sanitizedRoutes.length) {
      return { success: false, error: 'No routes configured' };
    }

    const routeConfig = sanitizedRoutes.map(({ name, description }) => ({
      name,
      description,
    }));

    const conversation = [{ role: 'user', content: trimmedQuery }];

    const taskInstruction = `
You are a helpful assistant designed to find the best suited route.
You are provided with route description within <routes></routes> XML tags:
<routes>

${JSON.stringify(routeConfig)}

</routes>

<conversation>

${JSON.stringify(conversation)}

</conversation>
`;

    const imageContext = hasImages
      ? '\n\nIMPORTANT: The user attached image(s). Prefer a route whose model supports vision/image analysis. If none do, return {"route": "other"}.'
      : '';

    const formatPrompt = `
Your task is to decide which route is best suit with user intent on the conversation in <conversation></conversation> XML tags. Follow the instruction:
1. If the latest intent from user is irrelevant or user intent is full filled, response with other route {"route": "other"}.
2. You must analyze the route descriptions and find the best match route for user latest intent.
3. You only response the name of the route that best matches the user's request, use the exact name in the <routes></routes>.
${imageContext}

Based on your analysis, provide your response in the following JSON formats if you decide to match any route:
{"route": "route_name"}
`;

    const { text } = await generateText({
      model: scira.languageModel('scira-arch-router'),
      messages: [{ role: 'user', content: taskInstruction + formatPrompt }],
      maxOutputTokens: 200,
      temperature: 0,
    });

    const rawMatch = text.match(/\{[\s\S]*\}/);
    const parsed = rawMatch ? JSON.parse(jsonrepair(rawMatch[0])) : null;
    const routeName = parsed?.route as string | undefined;

    const matchedRoute = sanitizedRoutes.find((route) => route.name === routeName);
    let resolvedModel = matchedRoute?.model || 'scira-default';

    if (hasImages && !hasVisionSupport(resolvedModel)) {
      const visionRoute = sanitizedRoutes.find((route) => hasVisionSupport(route.model));
      resolvedModel = visionRoute?.model || 'scira-default';
    }

    console.log('Resolved model:', resolvedModel);

    return {
      success: true,
      model: resolvedModel,
      route: matchedRoute?.name || 'other',
    };
  } catch (error) {
    console.error('Error routing with auto router:', error);
    return { success: false, error: 'Failed to route query' };
  }
}

export async function syncUserPreferences() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // This will be called from the client to migrate localStorage data
    // The actual migration logic will be in the hook
    return { success: true };
  } catch (error) {
    console.error('Error syncing user preferences:', error);
    return { success: false, error: 'Failed to sync user preferences' };
  }
}

// Fast pro user status check - UNIFIED VERSION
export async function getProUserStatusOnly(): Promise<boolean> {
  'use server';

  // Import here to avoid issues with SSR
  const { isUserPro } = await import('@/lib/user-data-server');
  return await isUserPro();
}

// Server action to get user's geolocation using Vercel
export async function getUserLocation() {
  try {
    const headersList = await headers();

    const request = {
      headers: headersList,
    };

    const locationData = geolocation(request);

    return {
      country: locationData.country || '',
      countryCode: locationData.country || '',
      city: locationData.city || '',
      region: locationData.region || '',
      isIndia: locationData.country === 'IN',
      loading: false,
    };
  } catch (error) {
    console.error('Failed to get location from Vercel:', error);
    return {
      country: 'Unknown',
      countryCode: '',
      city: '',
      region: '',
      isIndia: false,
      loading: false,
    };
  }
}

// Fetch chats for the authenticated user (paginated)
interface ChatMeta {
  preview?: string;
  model?: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^\|(.+)\|$/gm, (_, row) =>
      row
        .split('|')
        .map((cell: string) => cell.trim())
        .filter(Boolean)
        .join(' '),
    )
    .replace(/^\|?[\s:|-]+\|[\s:|-|]*$/gm, '')
    .replace(/[-]{3,}|[*]{3,}|[_]{3,}/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function buildPreviewMap(chatIds: string[]): Promise<Record<string, ChatMeta>> {
  if (chatIds.length === 0) return {};

  const rows = await db
    .select({ chatId: message.chatId, role: message.role, parts: message.parts, model: message.model })
    .from(message)
    .where(and(inArray(message.chatId, chatIds)))
    .orderBy(asc(message.createdAt));

  const seenUser = new Set<string>();
  const seenAssistant = new Set<string>();
  const map: Record<string, ChatMeta> = {};

  for (const msg of rows) {
    if (!map[msg.chatId]) map[msg.chatId] = {};

    if (msg.role === 'assistant' && !seenAssistant.has(msg.chatId)) {
      seenAssistant.add(msg.chatId);
      if (msg.model) map[msg.chatId].model = msg.model;
      const parts = Array.isArray(msg.parts) ? msg.parts : [];
      const raw = (parts as Array<{ type: string; text?: string }>)
        .filter((part) => part.type === 'text' && part.text)
        .map((part) => part.text!.trim())
        .join(' ');
      const text = stripMarkdown(raw);
      if (text) map[msg.chatId].preview = text.length > 160 ? text.slice(0, 160) + '…' : text;
    }

    if (msg.role === 'user' && !seenUser.has(msg.chatId) && !map[msg.chatId].preview) {
      seenUser.add(msg.chatId);
      const parts = Array.isArray(msg.parts) ? msg.parts : [];
      const raw = (parts as Array<{ type: string; text?: string }>)
        .filter((part) => part.type === 'text' && part.text)
        .map((part) => part.text!.trim())
        .join(' ');
      const text = stripMarkdown(raw);
      if (text) map[msg.chatId].preview = text.length > 160 ? text.slice(0, 160) + '…' : text;
    }
  }

  return map;
}

export async function getAllChatsWithPreview(limit: number = 25, offset: number = 0) {
  'use server';

  try {
    const user = await getUser();

    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const chats = await db.query.chat.findMany({
      where: and(
        eq(chat.userId, user.id),
        notExists(db.select({ id: buildSession.id }).from(buildSession).where(eq(buildSession.chatId, chat.id))),
      ),
      orderBy: [desc(chat.isPinned), desc(chat.updatedAt), desc(chat.id)],
      limit,
      offset,
    });

    const previewMap = await buildPreviewMap(chats.map((c) => c.id));
    const chatsWithPreview = chats.map((c) => ({
      ...c,
      preview: previewMap[c.id]?.preview ?? null,
      model: previewMap[c.id]?.model ?? null,
    }));

    return { chats: chatsWithPreview };
  } catch (error) {
    console.error('Error fetching chats:', error);
    return { error: 'Failed to fetch chats', status: 500 };
  }
}

// Search chats by title (paginated)
export async function searchChatsByTitle(query: string, limit: number = 25, offset: number = 0) {
  'use server';

  try {
    const user = await getUser();

    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const trimmedQuery = query?.trim() || '';

    const excludeBuildChats = notExists(
      db.select({ id: buildSession.id }).from(buildSession).where(eq(buildSession.chatId, chat.id)),
    );

    const chats = await db.query.chat.findMany({
      where:
        trimmedQuery.length === 0
          ? and(eq(chat.userId, user.id), excludeBuildChats)
          : and(eq(chat.userId, user.id), ilike(chat.title, `%${trimmedQuery}%`), excludeBuildChats),
      orderBy: [desc(chat.isPinned), desc(chat.updatedAt), desc(chat.id)],
      limit,
      offset,
    });

    const previewMap = await buildPreviewMap(chats.map((c) => c.id));
    const chatsWithPreview = chats.map((c) => ({
      ...c,
      preview: previewMap[c.id]?.preview ?? null,
      model: previewMap[c.id]?.model ?? null,
    }));

    return { chats: chatsWithPreview };
  } catch (error) {
    console.error('Error searching chats:', error);
    return { error: 'Failed to search chats', status: 500 };
  }
}
