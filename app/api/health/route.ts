import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { maindb } from '@/lib/db';
import { logOperationalError } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await maindb.execute(sql`select 1`);
    return NextResponse.json({
      status: 'ok',
      service: 'twiga-web',
      release: process.env.SOURCE_REVISION || process.env.RAILWAY_GIT_COMMIT_SHA || 'local',
    });
  } catch (error) {
    logOperationalError('health_check_failed', error, { dependency: 'postgres' });
    return NextResponse.json({ status: 'error', service: 'twiga-web' }, { status: 503 });
  }
}
