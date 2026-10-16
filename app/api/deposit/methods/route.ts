import { NextResponse } from 'next/server';
import { getDepositCatalog } from '@/lib/api/deposit';

/**
 * The deposit tab's method data (limits, fees, receiving banks, channels).
 * Answers the backend envelope so the client path survives the mock switch;
 * nothing here is per-member data.
 */
export async function GET() {
  try {
    return NextResponse.json({ status: '0', msg: 'Done', d: await getDepositCatalog() });
  } catch {
    return NextResponse.json(
      { status: '1', msg: 'deposit methods unavailable', d: null },
      { status: 500 },
    );
  }
}
