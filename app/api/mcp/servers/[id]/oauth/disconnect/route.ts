import { getCurrentUser } from '@/app/actions';
import { requireTwigaAppsUser } from '@/lib/mcp/access';
import { getUserMcpServerById, updateUserMcpServer } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireTwigaAppsUser();
    const { id } = await params;
    const server = await getUserMcpServerById({ id, userId: user.id });
    if (!server) return new ChatSDKError('not_found:api', 'MCP server not found').toResponse();

    await updateUserMcpServer({
      id,
      userId: user.id,
      values: {
        oauthAccessTokenEncrypted: null,
        oauthRefreshTokenEncrypted: null,
        oauthAccessTokenExpiresAt: null,
        oauthConnectedAt: null,
        oauthError: null,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:api', 'Failed to disconnect OAuth').toResponse();
  }
}
