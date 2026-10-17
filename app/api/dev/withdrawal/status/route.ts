import { NextResponse } from 'next/server';
import { MOCK_MODE } from '@/lib/api/client';
import { withdrawalRequestStore, type WithdrawalStatus } from '@/lib/mock-withdrawal/requests';

/**
 * MOCK-ONLY: the back office's step that a real backend runs on its own. It
 * exists only in mock mode, the rule `/dev/wallet` follows, so a member can
 * never settle their own request on a real deployment. `ENABLE_MOCK_SETTLE=1`
 * also opens it, for an e2e run against a build with mock mode switched off.
 */
export async function POST(request: Request) {
  if (!MOCK_MODE && process.env.ENABLE_MOCK_SETTLE !== '1') {
    return NextResponse.json({ status: '404', msg: 'Not found' }, { status: 404 });
  }

  let body: { id?: unknown; status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ status: '400', msg: 'Invalid body' }, { status: 400 });
  }

  if (typeof body.id !== 'string' || (body.status !== 'success' && body.status !== 'failed')) {
    return NextResponse.json({ status: '400', msg: 'Invalid body' }, { status: 400 });
  }

  const status: Exclude<WithdrawalStatus, 'pending'> = body.status;
  const result = await withdrawalRequestStore.settle(body.id, status);
  if (!result.ok) {
    const http = result.code === 'not_found' ? 404 : 409;
    return NextResponse.json({ status: result.code, msg: result.code, d: null }, { status: http });
  }
  return NextResponse.json({ status: '0', msg: 'Done', d: result.request });
}
