import { NextResponse } from 'next/server';
import { voucherCodeCatalogue, voucherStore } from '@/lib/mock-vouchers/store';

/**
 * MOCK-ONLY: the redemption leg of the Voucher (Promo Code) dialog. The reference
 * posts the code to `/{country}/a/bonusAction?code=…` and prints whatever the
 * backend answers, so this route owns the same four outcomes: the code must be in
 * the catalogue (`404`), may only be redeemed once (`409`), must be inside its own
 * window (`410`) and must still have vouchers left (`411`). `idempotencyKey` makes
 * a retried submit hand out one voucher.
 */
export async function POST(request: Request) {
  let body: { code?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const { code, idempotencyKey } = body;
  if (
    typeof code !== 'string' ||
    code.trim().length === 0 ||
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.length === 0
  ) {
    return envelope('14', 'Invalid Format', 400);
  }

  const result = await voucherStore.redeem(
    { code, idempotencyKey },
    { catalogue: voucherCodeCatalogue, now: new Date() },
  );

  if (!result.ok) {
    if (result.code === '404') return envelope('404', 'Invalid Voucher Code', 404);
    if (result.code === '409') return envelope('409', 'The Voucher is already redeemed', 409);
    if (result.code === '410')
      return envelope('410', 'The Voucher is not redeemable yet or has expired', 410);
    return envelope('411', 'The Vouchers are Finished Redeemed', 411);
  }

  return NextResponse.json({ status: '0', msg: 'Done', d: { ...result.entry, left: result.left } });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
