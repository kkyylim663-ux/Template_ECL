// MOCK-ONLY: 返水领取的客户端一半——把服务端记下的领取落到 mock 钱包与历史记录。
// 入账幂等键 = `rbt:<rebateId>`，与 walletService 的幂等表配合；localStorage 标记挡住重放。
// 客户端安全：不 import 服务端模块。

import type { HistoryRow } from '@/lib/api/schemas';
import { announceRecords, readRecordList } from '@/lib/mock-records';

/** The claim the server answered with (idempotent replay included). */
export interface ClaimedRebate {
  id: string;
  rebateId: string;
  reference: string;
  amountMinor: number;
  claimedAt: string;
}

export interface RebateLabels {
  /** The history row's `promoType`, e.g. "Slots rebate · 2026-10-13". */
  promoType: string;
}

export interface RebateRecord {
  rebateId: string;
  row: HistoryRow;
}

const CREDITED_KEY = 'brand:rebate-credited';
const RECORDS_KEY = 'brand:rebate-records';

export const rebateCreditKey = (rebateId: string) => `rbt:${rebateId}`;

export function readRebateRecords(): RebateRecord[] {
  return readRecordList(RECORDS_KEY).filter(
    (item): item is RebateRecord =>
      typeof item === 'object' && item !== null && typeof (item as RebateRecord).rebateId === 'string',
  );
}

/**
 * Credits a claimed rebate once. Returns the new record, or null when the row
 * was already credited here (refresh, second tab, replayed POST) — the balance
 * never moves twice. The service's claim state is the server's; this only moves
 * the mock wallet and mirrors the row into history.
 */
export function creditRebate(
  claim: ClaimedRebate,
  options: {
    labels: RebateLabels;
    credit: (amountMinor: number, idempotencyKey: string) => Promise<unknown>;
  },
): Promise<RebateRecord | null> {
  if (readRecordList(CREDITED_KEY).includes(claim.rebateId)) return Promise.resolve(null);
  return options.credit(claim.amountMinor, rebateCreditKey(claim.rebateId)).then(() => {
    const record: RebateRecord = {
      rebateId: claim.rebateId,
      row: {
        id: claim.id,
        kind: 'promo',
        at: claim.claimedAt,
        amountMinor: claim.amountMinor,
        promoType: options.labels.promoType,
        status: 'approved',
        reason: '',
      },
    };
    try {
      window.localStorage.setItem(
        CREDITED_KEY,
        JSON.stringify([...readRecordList(CREDITED_KEY), claim.rebateId]),
      );
      window.localStorage.setItem(RECORDS_KEY, JSON.stringify([record, ...readRebateRecords()]));
    } catch {
      // Private mode: the balance moved; the record just does not survive a reload.
    }
    announceRecords();
    return record;
  });
}
