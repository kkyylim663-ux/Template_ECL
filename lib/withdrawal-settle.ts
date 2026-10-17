// MOCK-ONLY: 提现结算的规则与本地记录（客户端安全，不 import 服务端模块）。
// failed 时同额退回主钱包，幂等键 = `wdr:<requestId>`；success 不动余额。
// 与 deposit-credit.ts 同一套 localStorage 模式：标记挡住刷新重放，记录供历史/收件箱合并。

import type { HistoryRow, InboxMessageRow as InboxRow } from '@/lib/api/schemas';
import { announceRecords, readRecordList } from '@/lib/mock-records';

export type SettledStatus = 'success' | 'failed';

export interface SettleableRequest {
  id: string;
  reference: string;
  amountMinor: number;
  methodLabel: string;
  status: 'pending' | SettledStatus;
  createdAt: string;
}

export interface SettleLabels {
  method: string;
  subject: string;
  body: (amount: string, reference: string) => string;
}

export interface WithdrawalRecord {
  requestId: string;
  status: SettledStatus;
  row: HistoryRow;
  notice: InboxRow;
}

const SETTLED_KEY = 'brand:withdrawal-settled';
const RECORDS_KEY = 'brand:withdrawal-records';

export const refundKey = (requestId: string) => `wdr:${requestId}`;

/** Only a request that reached a final state can settle; pending ones wait for the back office. */
export function isSettleable(request: SettleableRequest | null | undefined): request is SettleableRequest {
  return !!request && (request.status === 'success' || request.status === 'failed') && request.amountMinor > 0;
}

export function readWithdrawalRecords(): WithdrawalRecord[] {
  return readRecordList(RECORDS_KEY).filter(
    (item): item is WithdrawalRecord =>
      typeof item === 'object' && item !== null && typeof (item as WithdrawalRecord).requestId === 'string',
  );
}

/**
 * Settles a final withdrawal once. A failed one refunds the same amount to the
 * main wallet; a success only leaves the record. Returns null when this request
 * was already settled (refresh, second tab), so money never moves twice.
 */
export function settleWithdrawal(
  request: SettleableRequest,
  options: {
    at: string;
    currency: string;
    labels: SettleLabels;
    refund: (amountMinor: number, idempotencyKey: string) => Promise<unknown>;
  },
): Promise<WithdrawalRecord | null> {
  if (!isSettleable(request)) return Promise.resolve(null);
  if (readRecordList(SETTLED_KEY).includes(request.id)) return Promise.resolve(null);

  const moved =
    request.status === 'failed'
      ? options.refund(request.amountMinor, refundKey(request.id))
      : Promise.resolve(undefined);

  const status: SettledStatus = request.status === 'failed' ? 'failed' : 'success';
  return moved.then(() => {
    const amount = (request.amountMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 });
    const record: WithdrawalRecord = {
      requestId: request.id,
      status,
      row: {
        id: request.id,
        kind: 'withdrawal',
        at: options.at,
        amountMinor: request.amountMinor,
        method: options.labels.method,
        status: status === 'success' ? 'approved' : 'rejected',
        reason: '',
      },
      notice: {
        id: `wdr-${request.id}`,
        kind: 'important',
        subject: options.labels.subject,
        body: options.labels.body(`${options.currency} ${amount}`, request.reference),
        read: false,
        receivedAt: options.at,
      },
    };
    try {
      window.localStorage.setItem(SETTLED_KEY, JSON.stringify([...readRecordList(SETTLED_KEY), request.id]));
      window.localStorage.setItem(RECORDS_KEY, JSON.stringify([record, ...readWithdrawalRecords()]));
    } catch {
      // Private mode: the refund moved; the record just does not survive a reload.
    }
    announceRecords();
    return record;
  });
}
