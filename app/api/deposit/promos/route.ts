import { NextResponse } from 'next/server';
import { getPromotions } from '@/lib/api/content';
import { isDepositPromo } from '@/lib/api/deposit-promo';

/**
 * MOCK-ONLY: the deposit promotions the picker offers, taken from the display
 * promotion list and filtered to the deposit category.
 */
export async function GET() {
  try {
    const promos = (await getPromotions()).filter(isDepositPromo);
    return NextResponse.json({ status: '0', msg: 'Done', d: promos });
  } catch {
    return NextResponse.json({ status: '1', msg: 'promotions unavailable', d: null }, { status: 500 });
  }
}
