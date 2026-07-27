import 'server-only';

import { maindb } from '@/lib/db';
import { generationTelemetry } from '@/lib/db/schema';

export interface GenerationTelemetryInput {
  requestId: string;
  userId?: string | null;
  chatId?: string | null;
  route: string;
  model: string;
  providerModel?: string | null;
  status: 'completed' | 'aborted' | 'failed';
  durationMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  costUsd?: number | null;
  toolCallCount?: number | null;
}

export async function recordGenerationTelemetry(input: GenerationTelemetryInput) {
  const values = {
    requestId: input.requestId,
    userId: input.userId ?? null,
    chatId: input.chatId ?? null,
    route: input.route,
    model: input.model,
    providerModel: input.providerModel ?? null,
    status: input.status,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    costUsd: input.costUsd ?? null,
    toolCallCount: input.toolCallCount ?? null,
  } as const;

  await maindb
    .insert(generationTelemetry)
    .values(values)
    .onConflictDoUpdate({
      target: generationTelemetry.requestId,
      set: values,
    });
}
