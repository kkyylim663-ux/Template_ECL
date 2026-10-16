// MOCK-ONLY: 待处理的取消状态存 localStorage（brand:pending:cancelled）。接后台后改为调用取消接口（原站 cancel_transaction），取消记录由后台回写历史。
/**
 * Cancelled pending transactions. The reference cancels them through
 * `cancel_transaction` and the row then shows up in the member's history; our
 * fixture is static, so the cancellations live in localStorage and the history
 * panel merges them in client-side (`lib/api/pending.ts` readers).
 */
const KEY = 'brand:pending:cancelled';

/** The mock's cancel window, counted from each request's own timestamp. */
export const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** False once the window has closed: the row stays listed but cannot cancel. */
export function cancelWindowOpen(createdAt: string, nowMs: number): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return nowMs <= created + CANCEL_WINDOW_MS;
}

/** What the table shows: every request that has not been cancelled. */
export function visiblePendingRows<T extends { id: string }>(rows: T[], cancelledIds: string[]): T[] {
  return rows.filter((row) => !cancelledIds.includes(row.id));
}

/** "12:34:56" — the countdown chip. */
export function countdownText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export interface CancelledTransaction {
  /** The original transaction id. */
  id: string;
  kind: 'deposit' | 'withdrawal' | 'transfer';
  reference: string;
  /** The original createdAt, so the history row keeps its place in time. */
  at: string;
  cancelledAt: string;
  amountMinor: number;
  method: string;
  from?: string;
  to?: string;
}

export function readCancelledTransactions(): CancelledTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CancelledTransaction =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CancelledTransaction).id === 'string' &&
        typeof (item as CancelledTransaction).at === 'string',
    );
  } catch {
    return [];
  }
}

export function recordCancelledTransaction(
  entry: Omit<CancelledTransaction, 'cancelledAt'>,
): CancelledTransaction {
  const full: CancelledTransaction = { ...entry, cancelledAt: new Date().toISOString() };
  const next = [full, ...readCancelledTransactions().filter((item) => item.id !== full.id)];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: the current session still shows the row as gone.
  }
  return full;
}

export function clearCancelledTransactions(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
