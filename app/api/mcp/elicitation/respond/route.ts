import { requireTwigaAppsUser } from '@/lib/mcp/access';
import { ChatSDKError } from '@/lib/errors';
import {
  clearPendingMcpElicitation,
  hasPendingMcpElicitation,
  storeMcpElicitationResponse,
} from '@/lib/mcp/elicitation-store';
import { pendingElicitations } from '@/lib/tools/mcp-client';
import { z } from 'zod';

const respondSchema = z.object({
  elicitationId: z.string().min(1),
  action: z.enum(['accept', 'decline', 'cancel']),
  content: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    await requireTwigaAppsUser();

    const input = respondSchema.parse(await request.json());
    const resolver = pendingElicitations.get(input.elicitationId);
    const responsePayload = {
      action: input.action,
      content: input.content,
    };

    if (resolver) {
      resolver(responsePayload);
      await clearPendingMcpElicitation(input.elicitationId);
      return Response.json({ ok: true });
    }

    const stillPending = await hasPendingMcpElicitation(input.elicitationId);
    if (stillPending) {
      await storeMcpElicitationResponse(input.elicitationId, responsePayload);
      return Response.json({ ok: true, accepted: true });
    }

    return Response.json({ ok: false, error: 'Elicitation not found or already resolved' }, { status: 404 });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api').toResponse();
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }
}
