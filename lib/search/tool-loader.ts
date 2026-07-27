import 'server-only';

import type { SearchProvider } from '@/lib/utils';

interface LoadConfiguredToolsParams {
  activeToolNames: string[];
  dataStream: any;
  searchProvider: SearchProvider | undefined;
  timezone: string | undefined;
  contextFiles: Array<{ url: string; contentType: string; name?: string }>;
  extremeSearchModel: string | undefined;
  includeMcpTools: boolean;
  mcpDynamicTools: Record<string, any>;
  lightweightUser: { userId: string; email: string; isProUser: boolean } | null;
}

export async function loadConfiguredTools({
  activeToolNames,
  dataStream,
  searchProvider,
  contextFiles,
  includeMcpTools,
  mcpDynamicTools,
}: LoadConfiguredToolsParams): Promise<Record<string, any>> {
  const tools: Record<string, any> = {};
  const uniqueToolNames = [...new Set(activeToolNames)];

  await Promise.all(
    uniqueToolNames.map(async (toolName) => {
      if (toolName === 'web_search') {
        const { webSearchTool } = await import('@/lib/tools/web-search');
        tools.web_search = webSearchTool(dataStream, searchProvider);
      }

      if (toolName === 'tanzanian_business_directory') {
        const { tanzanianBusinessDirectoryTool } = await import('@/lib/tools/tanzanian-business-directory');
        tools.tanzanian_business_directory = tanzanianBusinessDirectoryTool;
      }

      if (toolName === 'youtube_search') {
        const { youtubeSearchTool } = await import('@/lib/tools/youtube-search');
        tools.youtube_search = youtubeSearchTool;
      }

      if (toolName === 'file_query_search' && contextFiles.length > 0) {
        const { createFileQuerySearchTool } = await import('@/lib/tools/file-query-search');
        tools.file_query_search = createFileQuerySearchTool(contextFiles, dataStream);
      }
    }),
  );

  if (includeMcpTools) Object.assign(tools, mcpDynamicTools);
  return tools;
}
