import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logOperationalError } from '@/lib/observability';

const clientErrorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(500),
  digest: z.string().trim().max(200).optional(),
  path: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 10_000) {
    return new NextResponse(null, { status: 413 });
  }

  const parsed = clientErrorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new NextResponse(null, { status: 400 });
  }

  logOperationalError('client_render_error', new Error(parsed.data.message), {
    clientErrorName: parsed.data.name,
    digest: parsed.data.digest,
    path: parsed.data.path,
  });

  return new NextResponse(null, { status: 204 });
}
