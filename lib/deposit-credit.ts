// MOCK-ONLY: 充值成功入账的规则与本地记录（客户端安全，不 import 服务端模块）。
// 入账幂等键 = `gw:<orderId>`，与 walletService 的幂等表配合；localStorage 标记挡住刷新重放。

import type { HistoryRow, InboxMessageRow as InboxRow } from '@/lib/api/schemas';
import { announceRecords, readRecordList } from '@/lib/mock-records';

export interface CreditableOrder {
  orderId: string;
  amountMinor: number;
  outcome?: 'success' | 'failed' | 'processing';
  creditedAt?: string;
}

export interface CreditLabels {
  method: string;
  subject: string;
  body: (amount: string, orderId: string) => string;
}

export interface DepositRecord {
  orderId: string;
  row: HistoryRow;
  notice: InboxRow;
}

const CREDITED_KEY = 'brand:deposit-credited';
const RECORDS_KEY = 'brand:deposit-records';

export const creditKey = (orderId: string) => `gw:${orderId}`;

/** Only a success ruling the server stamped with `creditedAt` may move money. */
export function isCreditable(order: CreditableOrder | null | undefined): order is CreditableOrder {
  return !!order && order.outcome === 'success' && !!order.creditedAt && order.amountMinor > 0;
}

export function readDepositRecords(): DepositRecord[] {
  return readRecordList(RECORDS_KEY).filter(
    (item): item is DepositRecord =>
      typeof item === 'object' && item !== null && typeof (item as DepositRecord).orderId === 'string',
  );
}

/**
 * Credits a successful gateway order once. Returns the new record, or null when
 * the order was already credited (refresh, second tab) — the balance never moves twice.
 */
export function creditDeposit(
  order: CreditableOrder,
  options: {
    at: string;
    currency: string;
    labels: CreditLabels;
    credit: (amountMinor: number, idempotencyKey: string) => Promise<unknown>;
  },
): Promise<DepositRecord | null> {
  if (!isCreditable(order)) return Promise.resolve(null);
  if (readRecordList(CREDITED_KEY).includes(order.orderId)) return Promise.resolve(null);
  return options.credit(order.amountMinor, creditKey(order.orderId)).then(() => {
    const amount = (order.amountMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 });
    const record: DepositRecord = {
      orderId: order.orderId,
      row: {
        id: order.orderId,
        kind: 'deposit',
        at: options.at,
        amountMinor: order.amountMinor,
        method: options.labels.method,
        status: 'approved',
        reason: '',
      },
      notice: {
        id: `dep-${order.orderId}`,
        kind: 'important',
        subject: options.labels.subject,
        body: options.labels.body(`${options.currency} ${amount}`, order.orderId),
        read: false,
        receivedAt: options.at,
      },
    };
    try {
      window.localStorage.setItem(CREDITED_KEY, JSON.stringify([...readRecordList(CREDITED_KEY), order.orderId]));
      window.localStorage.setItem(RECORDS_KEY, JSON.stringify([record, ...readDepositRecords()]));
    } catch {
      // Private mode: the balance moved; the record just does not survive a reload.
    }
    announceRecords();
    return record;
  });
}
