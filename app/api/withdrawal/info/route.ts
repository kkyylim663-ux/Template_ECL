import { NextResponse } from 'next/server';
import { getWithdrawalInfo } from '@/lib/api/withdrawal';

/**
 * The withdrawal page's data (bound accounts, limits, document-check state).
 * Answers the backend envelope so the client path survives the mock switch.
 */
export async function GET() {
  try {
    return NextResponse.json({ status: '0', msg: 'Done', d: await getWithdrawalInfo() });
  } catch {
    return NextResponse.json(
      { status: '1', msg: 'withdrawal info unavailable', d: null },
      { status: 500 },
    );
  }
}
