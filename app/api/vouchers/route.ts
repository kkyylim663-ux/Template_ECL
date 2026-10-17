import { NextResponse } from 'next/server';
import { getVouchersInfo } from '@/lib/api/vouchers';

/**
 * MOCK-ONLY: the member's redeemed vouchers, for the Voucher (Promo Code) dialog's
 * own list. The reference's dialog has no list (it prints the redeem answer and
 * closes), so this build keeps one — registered in ecl-site/MOCK_INVENTORY.md.
 */
export async function GET() {
  const info = await getVouchersInfo();
  return NextResponse.json({ status: '0', msg: 'Done', d: info });
}
