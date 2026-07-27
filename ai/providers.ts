import 'server-only';

import { customProvider } from 'ai';
import { createOpenRouter, type OpenRouterChatSettings } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Twiga AI',
    'Content-Type': 'application/json',
  },
});

const defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-oss-20b';
const searchModel = process.env.OPENROUTER_SEARCH_MODEL || 'deepseek/deepseek-v4-flash';
const routerModel = process.env.OPENROUTER_ROUTER_MODEL || defaultModel;
const reasoningModel = process.env.OPENROUTER_REASONING_MODEL || 'z-ai/glm-5.2';
const meteredModel = (modelId: string, settings: OpenRouterChatSettings = {}) =>
  openrouter(modelId, {
    ...settings,
    usage: {
      include: true,
    },
  });

const utilityModel = meteredModel(defaultModel, {
  reasoning: {
    effort: 'low',
    exclude: true,
  },
  provider: {
    sort: 'price',
    allow_fallbacks: true,
  },
});

const companionModel = meteredModel(searchModel, {
  reasoning: {
    max_tokens: 512,
    exclude: true,
  },
  provider: {
    sort: 'latency',
    allow_fallbacks: true,
  },
});

const hardReasoningModel = meteredModel(reasoningModel, {
  reasoning: {
    max_tokens: 1200,
    exclude: true,
  },
  provider: {
    sort: 'latency',
    allow_fallbacks: true,
  },
});

/**
 * Twiga keeps Scira's stable internal model IDs so upstream chat flows remain
 * compatible, while every enabled MVP call is fulfilled through OpenRouter.
 */
export const scira = customProvider({
  languageModels: {
    'scira-default': companionModel,
    'scira-reasoning': hardReasoningModel,
    'scira-auto': companionModel,
    'scira-arch-router': meteredModel(routerModel, {
      reasoning: { effort: 'low', exclude: true },
      provider: { sort: 'price', allow_fallbacks: true },
    }),
    'scira-name': utilityModel,
    'scira-enhance': utilityModel,
    'scira-follow-up': utilityModel,
    // Dormant tools can still resolve during the transition, but are not shown
    // or accepted by Twiga's MVP search endpoint.
    'scira-ext-1': companionModel,
    'scira-gemini-3-flash': utilityModel,
  },
  fallbackProvider: openrouter,
});

export type { ModelProvider, ProviderInfo, Model } from './models';
export {
  PROVIDERS,
  models,
  getModelConfig,
  requiresAuthentication,
  requiresProSubscription,
  requiresMaxSubscription,
  isFreeUnlimited,
  hasVisionSupport,
  hasPdfSupport,
  hasReasoningSupport,
  isExperimentalModel,
  getMaxOutputTokens,
  getModelParameters,
  canUseModel,
  shouldBypassRateLimits,
  getAcceptedFileTypes,
  supportsExtremeMode,
  getExtremeModels,
  supportsCanvasMode,
  isModelRestrictedInRegion,
  getFilteredModels,
  authRequiredModels,
  proRequiredModels,
  freeUnlimitedModels,
  getModelProvider,
  getModelProviderInfo,
  getActiveProviders,
  getModelsByProvider,
} from './models';
