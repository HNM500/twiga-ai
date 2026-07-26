import { NextResponse } from 'next/server';

function disabledResponse() {
  return NextResponse.json(
    { error: 'Lookout automation is not enabled in the Twiga MVP' },
    { status: 404 },
  );
}

export const GET = disabledResponse;
export const POST = disabledResponse;
