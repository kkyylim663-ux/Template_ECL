import { NextResponse } from 'next/server';
import { getRebatesInfo } from '@/lib/api/rebates';

/**
 * The rebates page's data: the settlement periods, the per-product rows and the
 * claims already made (T63). Answers the backend envelope so the client path
 * survives the mock switch.
 */
export async function GET() {
  try {
    return NextResponse.json({ status: '0', msg: 'Done', d: await getRebatesInfo() });
  } catch {
    return NextResponse.json({ status: '1', msg: 'rebates unavailable', d: null }, { status: 500 });
  }
}
