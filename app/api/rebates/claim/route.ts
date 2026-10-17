import { NextResponse } from 'next/server';
import { getRebatesInfo } from '@/lib/api/rebates';
import { rebateClaimStore } from '@/lib/mock-rebates/claims';

/**
 * MOCK-ONLY: the claim leg of the reference's rebate payout. The member's
 * balance is credited in the browser (the wallet is client-side mock state), so
 * this route owns only the server rules: the rebate must exist, must not have
 * been claimed before, and must clear the minimum payout. `idempotencyKey`
 * makes a retried or double-submitted claim pay out once.
 */
export async function POST(request: Request) {
  let body: { rebateId?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const { rebateId, idempotencyKey } = body;
  if (
    typeof rebateId !== 'string' ||
    rebateId.length === 0 ||
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length === 0
  ) {
    return envelope('14', 'Invalid Format', 400);
  }

  const info = await getRebatesInfo().catch(() => null);
  if (!info) return envelope('1', 'rebates unavailable', 503);

  const row = info.rows.find((entry) => entry.id === rebateId);
  if (!row) return envelope('404', 'Rebate not found', 404);

  const result = await rebateClaimStore.claim(
    {
      rebateId: row.id,
      idempotencyKey,
      period: row.period,
      product: row.product,
      turnoverMinor: row.turnoverMinor,
      ratePct: row.ratePct,
      amountMinor: row.amountMinor,
    },
    { minPayoutMinor: info.minPayoutMinor, now: new Date() },
  );

  if (!result.ok) {
    const message: Record<typeof result.code, string> = {
      '210': 'Rebate Amount Error [MIN]',
      '409': 'This rebate has already been claimed.',
    };
    return envelope(result.code, message[result.code], result.code === '409' ? 409 : 400);
  }

  return NextResponse.json({
    status: '0',
    msg: 'Done',
    d: {
      id: result.claim.id,
      rebateId: result.claim.rebateId,
      reference: result.claim.reference,
      amountMinor: result.claim.amountMinor,
      claimedAt: result.claim.claimedAt,
      replayed: result.replayed,
    },
  });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
