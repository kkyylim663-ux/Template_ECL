// MOCK-ONLY: 礼券（T66）——已兑换礼券的列表（`.mock-data/voucher-store.json` 里属于
// 当前会员的记录，状态按码自己的有效期算）。接后台后换成会员礼券列表接口。
import { voucherStore } from '@/lib/mock-vouchers/store';
import { voucherStatus } from '@/lib/voucher-rules';
import { vouchersInfoSchema, type VouchersInfo } from './schemas';

/**
 * The vouchers this member has redeemed, with the state this build shows. The
 * reference keeps the list in the backend (its dialog only prints the redeem
 * answer), so the rows are this build's.
 */
export async function getVouchersInfo(now = new Date()): Promise<VouchersInfo> {
  const snapshot = await voucherStore.read();

  const vouchers = snapshot.redemptions.map((entry) => ({
    id: entry.id,
    code: entry.code,
    amountMinor: entry.amountMinor,
    redeemedAt: entry.redeemedAt,
    expiresAt: entry.expiresAt,
    status: voucherStatus(entry.expiresAt, now),
  }));

  return vouchersInfoSchema.parse({ vouchers });
}
