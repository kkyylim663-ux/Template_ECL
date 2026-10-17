import { NextResponse } from 'next/server';
import { getTicketsInfo } from '@/lib/api/tickets';

/**
 * The ticket centre's data (T65): every ticket this member holds with the state
 * this build shows. Answers the backend envelope so the client path survives the
 * mock switch.
 */
export async function GET() {
  try {
    return NextResponse.json({ status: '0', msg: 'Done', d: await getTicketsInfo() });
  } catch {
    return NextResponse.json({ status: '1', msg: 'tickets unavailable', d: null }, { status: 500 });
  }
}
