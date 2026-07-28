import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';
import { TwigaCoreClient } from '@/lib/twiga-core/client';

let client: TwigaCoreClient | null = null;

function getClient() {
  client ??= new TwigaCoreClient({
    baseUrl: serverEnv.TWIGA_CORE_URL,
    assertionSecret: serverEnv.TWIGA_CORE_ASSERTION_SECRET,
  });
  return client;
}

export const tanzanianBusinessDirectoryTool = tool({
  description:
    'Use Twiga’s reviewed Tanzania bank directory. You MUST use operation "list_all" when the user asks for all banks, every bank, a complete bank list, or how many banks are listed; it returns the complete current reviewed catalog as compact records. Use operation "search" for one or a few matching banks and their rich profiles. Never infer that the directory is incomplete from a search result limit, and do not use web search as a substitute for bank identity or directory coverage.',
  inputSchema: z.object({
    operation: z
      .enum(['list_all', 'search'])
      .describe('Use list_all for a complete bank catalog; use search for detailed matching profiles.'),
    query: z
      .string()
      .trim()
      .max(120)
      .optional()
      .describe('Required for search: bank name or partial name, such as NMB, CRDB, or Amana.'),
    limit: z.number().int().min(1).max(10).default(5).describe('For search only: maximum rich profiles to return.'),
  }),
  execute: async ({ operation, query, limit }) => {
    if (operation === 'list_all') {
      const catalog = await getClient().listBanks();
      return {
        operation,
        ...catalog,
        isComplete: true,
        coverage:
          'Complete current reviewed Bank of Tanzania bank-sector snapshot; one canonical profile per institution, not one record per branch.',
        responseGuidance: `Present all ${catalog.total} returned institutions. This catalog response is complete, so do not warn that more directory results may be missing and do not recommend web search for the rest.`,
      };
    }

    const normalizedQuery = query?.trim();
    if (!normalizedQuery) {
      return { operation, error: 'A bank name or partial name is required for a detailed search.' };
    }
    const search = await getClient().searchBanks(normalizedQuery, limit);
    return {
      operation,
      query: normalizedQuery,
      ...search,
      isComplete: !search.hasMore,
      coverage: 'Bank of Tanzania-listed banks; one canonical profile per institution, not one record per branch.',
      responseGuidance: search.hasMore
        ? `There are ${search.total} matching profiles; this response contains ${search.count}. Say that the search is limited rather than claiming the directory lacks other institutions.`
        : `All ${search.total} matching profiles are included.`,
    };
  },
});
