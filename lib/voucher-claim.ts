// MOCK-ONLY: 礼券兑换的客户端一半（T66）——把服务端记下的兑换落到 mock 钱包与历史记录。
// 入账幂等键 = `vch:<CODE>`，与 walletService 的幂等表配合；localStorage 标记挡住重放。
// 客户端安全：不 import 服务端模块。

import type { HistoryRow } from '@/lib/api/schemas';
import { announceRecords, readRecordList } from '@/lib/mock-records';

/** The redemption the server answered with (idempotent replay included). */
export interface RedeemedVoucher {
  id: string;
  code: string;
  amountMinor: number;
  expiresAt: string;
  redeemedAt: string;
}

export interface VoucherLabels {
  /** The history row's `promoType`, e.g. "Voucher WELCOME188". */
  promoType: string;
}

export interface VoucherRecord {
  code: string;
  row: HistoryRow;
}

const CREDITED_KEY = 'brand:voucher-credited';
const RECORDS_KEY = 'brand:voucher-records';

export const voucherCreditKey = (code: string) => `vch:${code.trim().toUpperCase()}`;

export function readVoucherRecords(): VoucherRecord[] {
  return readRecordList(RECORDS_KEY).filter(
    (item): item is VoucherRecord =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as VoucherRecord).code === 'string' &&
      'row' in item,
  );
}

/**
 * Credits a redeemed voucher once. Returns the new record, or null when the code
 * was already credited here (refresh, second tab, replayed POST) — the balance
 * never moves twice. The redemption itself is the server's; this only moves the
 * mock wallet and mirrors the row into history.
 */
export function creditVoucher(
  voucher: RedeemedVoucher,
  options: {
    labels: VoucherLabels;
    credit: (amountMinor: number, idempotencyKey: string) => Promise<unknown>;
  },
): Promise<VoucherRecord | null> {
  const code = voucher.code.trim().toUpperCase();
  if (readRecordList(CREDITED_KEY).includes(code)) return Promise.resolve(null);
  return options.credit(voucher.amountMinor, voucherCreditKey(code)).then(() => {
    const record: VoucherRecord = {
      code,
      row: {
        id: voucher.id,
        kind: 'promo',
        at: voucher.redeemedAt,
        amountMinor: voucher.amountMinor,
        promoType: options.labels.promoType,
        status: 'approved',
        reason: '',
      },
    };
    try {
      window.localStorage.setItem(
        CREDITED_KEY,
        JSON.stringify([...readRecordList(CREDITED_KEY), code]),
      );
      window.localStorage.setItem(RECORDS_KEY, JSON.stringify([record, ...readVoucherRecords()]));
    } catch {
      // Private mode: the balance moved; the record just does not survive a reload.
    }
    announceRecords();
    return record;
  });
}
