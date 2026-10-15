import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session/server';

/** Says whether a member is signed in. The token itself never leaves the server. */
export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    status: '0',
    msg: 'Done',
    d: { member: session !== null, username: session?.username ?? null },
  });
}
