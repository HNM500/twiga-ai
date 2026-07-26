import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'The Raycast integration is not enabled in the Twiga MVP' },
    { status: 404 },
  );
}
