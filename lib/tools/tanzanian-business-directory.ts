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
    'Search Twiga’s reviewed Tanzania business directory. The MVP currently covers Bank of Tanzania-listed banks. Use this for canonical bank identity, licence type/status, verified official website/contact channels, provenance, and Google Maps branch or ATM links. Do not use web search as a substitute when the user is trying to find or identify a Tanzanian bank.',
  inputSchema: z.object({
    query: z.string().trim().min(1).max(120).describe('Bank name or partial name, such as NMB, CRDB, or Amana.'),
    limit: z.number().int().min(1).max(10).default(5).describe('Maximum canonical bank profiles to return.'),
  }),
  execute: async ({ query, limit }) => {
    const results = await getClient().searchBanks(query, limit);
    return {
      query,
      count: results.length,
      coverage: 'Bank of Tanzania-listed banks; one canonical profile per institution, not one record per branch.',
      results,
    };
  },
});
