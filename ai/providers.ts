import 'server-only';

import { customProvider } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Twiga AI',
    'Content-Type': 'application/json',
  },
});

const defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.5-flash-lite';
const searchModel = process.env.OPENROUTER_SEARCH_MODEL || defaultModel;
const routerModel = process.env.OPENROUTER_ROUTER_MODEL || defaultModel;
const meteredModel = (modelId: string) =>
  openrouter(modelId, {
    usage: {
      include: true,
    },
  });

/**
 * Twiga keeps Scira's stable internal model IDs so upstream chat flows remain
 * compatible, while every enabled MVP call is fulfilled through OpenRouter.
 */
export const scira = customProvider({
  languageModels: {
    'scira-default': meteredModel(searchModel),
    'scira-auto': meteredModel(searchModel),
    'scira-arch-router': meteredModel(routerModel),
    'scira-name': meteredModel(defaultModel),
    'scira-enhance': meteredModel(defaultModel),
    'scira-follow-up': meteredModel(defaultModel),
    // Dormant tools can still resolve during the transition, but are not shown
    // or accepted by Twiga's MVP search endpoint.
    'scira-ext-1': meteredModel(searchModel),
    'scira-gemini-3-flash': meteredModel(defaultModel),
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
