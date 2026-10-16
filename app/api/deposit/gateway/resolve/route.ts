import { NextResponse } from 'next/server';
import { orderStore, type DepositOutcome } from '@/lib/mock-deposit/orders';

const OUTCOMES: DepositOutcome[] = ['success', 'failed', 'processing'];

/**
 * MOCK-ONLY: the gateway's callback — this build's stand-in for the real gateway
 * hitting the notify / return URL. The FIRST ruling wins and is the only one that
 * can set `creditedAt`; a repeat call (or a result-page refresh) never replays it.
 * T59 will read `creditedAt` to move the balance; T54 only records it.
 */
export async function POST(request: Request) {
  let body: { orderId?: unknown; outcome?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const { orderId, outcome } = body;
  if (
    typeof orderId !== 'string' ||
    orderId === '' ||
    !OUTCOMES.includes(outcome as DepositOutcome)
  ) {
    return envelope('14', 'Invalid Format', 400);
  }

  const result = await orderStore.resolve(orderId, outcome as DepositOutcome);
  if (!result.ok) {
    if (result.reason === 'missing') return envelope('404', 'Deposit order not found', 404);
    return envelope('4', 'Deposit order expired', 410);
  }

  return NextResponse.json({
    status: '0',
    msg: 'Done',
    d: {
      orderId: result.order.orderId,
      outcome: result.order.outcome,
      firstRuling: result.firstRuling,
      rulings: result.order.rulings,
      creditedAt: result.order.creditedAt ?? null,
    },
  });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
