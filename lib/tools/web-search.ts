import { tool } from 'ai';
import Exa from 'exa-js';
import { z } from 'zod';

import { serverEnv } from '@/env/server';
import type { ChatMessage } from '@/lib/types';
import type { UIMessageStreamWriter } from 'ai';

let exaClient: Exa | null = null;

function getExaClient() {
  exaClient ??= new Exa(serverEnv.EXA_API_KEY);
  return exaClient;
}

function cleanTitle(title: string) {
  return title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

export function webSearchTool(
  dataStream?: UIMessageStreamWriter<ChatMessage>,
  _searchProvider: 'exa' | 'parallel' | 'firecrawl' = 'exa',
) {
  return tool({
    description: `Search the live web with Exa. Use one concise query for a simple factual lookup and up to five distinct queries when a topic needs broader verification. Include the current year or an explicit date only when freshness matters. Results contain URLs, titles, highlighted content, dates, and authors; cite the returned URLs inline in the final answer.`,
    inputSchema: z.object({
      queries: z
        .array(z.string().describe('One to five distinct web-search queries.'))
        .min(1),
      maxResults: z.array(z.number().describe('Maximum results for each corresponding query.')).optional(),
      topics: z
        .array(z.enum(['general', 'news']).describe('Topic for each corresponding query.'))
        .optional(),
      quality: z
        .array(z.enum(['default', 'best']).describe('Search quality for each corresponding query.'))
        .optional(),
      startDates: z
        .array(z.string().nullable().optional().describe('Optional ISO start date for each query.'))
        .optional(),
    }),
    execute: async ({ queries, maxResults, topics, quality, startDates }) => {
      const exa = getExaClient();
      const searches = await Promise.all(
        queries.map(async (query, index) => {
          dataStream?.write({
            type: 'data-query_completion',
            data: { query, index, total: queries.length, status: 'started', resultsCount: 0, imagesCount: 0 },
          });

          try {
            const startDate = startDates?.[index] || startDates?.[0] || undefined;
            const response = await exa.search(query, {
              type: (quality?.[index] || quality?.[0]) === 'best' ? 'deep' : 'instant',
              numResults: maxResults?.[index] || maxResults?.[0] || 8,
              category: (topics?.[index] || topics?.[0]) === 'news' ? 'news' : undefined,
              ...(startDate ? { startPublishedDate: new Date(startDate).toISOString() } : {}),
              contents: { highlights: { maxCharacters: 4000 } },
            });

            const seen = new Set<string>();
            const results = response.results
              .filter((result) => {
                if (!result.url || seen.has(result.url)) return false;
                seen.add(result.url);
                return true;
              })
              .map((result) => ({
                url: result.url,
                title: cleanTitle(result.title || ''),
                content: (result.highlights?.join(' ') || '').slice(0, 2000),
                published_date: result.publishedDate || undefined,
                author: result.author || undefined,
              }));

            dataStream?.write({
              type: 'data-query_completion',
              data: {
                query,
                index,
                total: queries.length,
                status: 'completed',
                resultsCount: results.length,
                imagesCount: 0,
              },
            });

            return { query, results, images: [] };
          } catch (error) {
            console.error(`Exa search failed for query "${query}":`, error);
            dataStream?.write({
              type: 'data-query_completion',
              data: { query, index, total: queries.length, status: 'error', resultsCount: 0, imagesCount: 0 },
            });
            return { query, results: [], images: [] };
          }
        }),
      );

      return { searches };
    },
  });
}
