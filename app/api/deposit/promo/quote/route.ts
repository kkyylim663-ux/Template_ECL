import { NextResponse } from 'next/server';
import { getPromotions } from '@/lib/api/content';
import { getDepositCatalog } from '@/lib/api/deposit';
import { isDepositPromo, quoteDepositPromo } from '@/lib/api/deposit-promo';
import { isDepositMethodId } from '@/lib/api/schemas';

/**
 * MOCK-ONLY: the bonus and turnover of one deposit under one promotion. The
 * minimum deposit is the method's own minimum, so the quote follows the tab the
 * deposit is made from. Nothing is credited here; T59 links the result.
 */
export async function POST(request: Request) {
  let body: { promoId?: unknown; amountMinor?: unknown; methodId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return envelope('14', 'Invalid Format', 400);
  }

  const amountMinor = body.amountMinor;
  if (typeof amountMinor !== 'number' || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return envelope('14', 'Invalid Format', 400);
  }
  if (!isDepositMethodId(body.methodId)) return envelope('14', 'Invalid Format', 400);

  const [promos, catalog] = await Promise.all([
    getPromotions().catch(() => null),
    getDepositCatalog().catch(() => null),
  ]);
  const promo = promos?.filter(isDepositPromo).find((entry) => entry.id === body.promoId);
  const method = catalog?.methods.find((entry) => entry.id === body.methodId);
  if (!promo || !method) return envelope('50', 'Deposit Promotion Not Found', 404);

  const quote = quoteDepositPromo(promo, amountMinor, method.minAmountMinor);
  return NextResponse.json({ status: '0', msg: 'Done', d: { promoId: promo.id, ...quote } });
}

function envelope(status: string, msg: string, http: number) {
  return NextResponse.json({ status, msg, d: null }, { status: http });
}
