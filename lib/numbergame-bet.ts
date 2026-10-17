// MOCK-ONLY: 数字游戏投注的客户端流程（T67）——服务端先受理（`POST /api/numbergame/bets`，
// 幂等键），通过后用同一幂等键从主钱包扣一次（`ng:<betId>`，刷新重放不会二次扣款），
// 再写一条 kind `bet`、event `numberGame` 的本地记录（`brand:numbergame-records`）并广播，
// 让账页的历史表在页面打开时就显示这注（同 T63/T64/T65 的入账模式）。
// 客户端安全：不 import 任何服务端模块。
import { walletService } from '@/lib/api/wallet';
import { announceRecords, readRecordList } from '@/lib/mock-records';
import type { HistoryRow } from '@/lib/api/schemas';

export const NUMBERGAME_RECORDS_KEY = 'brand:numbergame-records';

/** One history row of the bet kind, exactly the fixture's shape. */
export type NumberGameRecord = { row: Extract<HistoryRow, { kind: 'bet' }> };

export type BetLine = number[];

export type PlacedBet = {
  id: string;
  lines: BetLine[];
  amountMinor: number;
  totalMinor: number;
  placedAt: string;
};

/** `210`…`213` are the store's rejections; `network` is anything else. */
export type BetFailure = '210' | '211' | '212' | '213' | 'credit' | 'network';

export class BetError extends Error {
  constructor(readonly code: BetFailure) {
    super(code);
  }
}

/** A retried submit must reuse its key so the server replays instead of double-booking. */
export function newBetKey(): string {
  return crypto.randomUUID();
}

/**
 * The reference's submit is one call to its backend; this build's is the mock
 * store plus the browser wallet it stands in for. The server accepts first — a
 * rejected slip never touches the balance.
 */
export async function placeBet(draft: {
  lines: BetLine[];
  amountMinor: number;
  idempotencyKey: string;
}): Promise<{ bet: PlacedBet; totalMinor: number }> {
  let response: Response;
  try {
    response = await fetch('/api/numbergame/bets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft),
    });
  } catch {
    throw new BetError('network');
  }

  const body = (await response.json().catch(() => null)) as
    | { status: string; msg: string; d: PlacedBet }
    | null;
  if (!body || body.status !== '0' || !body.d) {
    const code = body?.status;
    throw new BetError(
      code === '210' || code === '211' || code === '212' || code === '213' ? code : 'network',
    );
  }

  const bet = body.d;
  const totalMinor = bet.totalMinor;

  // The stake leaves the main wallet once: the key is the bet's own id, so a
  // reload that replays this call cannot charge twice.
  if (walletService.totalMinor() < totalMinor) throw new BetError('credit');
  await walletService.withdraw(totalMinor, `ng:${bet.id}`);
  writeBetRecord(bet);
  return { bet, totalMinor };
}

/** The history row the bet lands in: 注数, 流水, 输赢 (−stake — a placed bet has not won yet). */
export function betRow(bet: PlacedBet): Extract<HistoryRow, { kind: 'bet' }> {
  return {
    id: `ng-${bet.id}`,
    kind: 'bet',
    at: bet.placedAt,
    event: 'numberGame',
    transactions: bet.lines.length,
    turnoverMinor: bet.totalMinor,
    winLoseMinor: -bet.totalMinor,
    realBetMinor: bet.totalMinor,
  };
}

function writeBetRecord(bet: PlacedBet): void {
  const rows = readNumberGameRecords();
  if (rows.some((record) => record.row.id === `ng-${bet.id}`)) return;
  persist([{ row: betRow(bet) }, ...rows]);
  announceRecords();
}

function persist(records: NumberGameRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NUMBERGAME_RECORDS_KEY, JSON.stringify(records));
}

/** Rows written by this browser, newest first — merged into the history page. */
export function readNumberGameRecords(): NumberGameRecord[] {
  return readRecordList(NUMBERGAME_RECORDS_KEY) as NumberGameRecord[];
}
