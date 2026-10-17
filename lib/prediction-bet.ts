// MOCK-ONLY: 预测投注的客户端流程（T68）——服务端先受理（`POST /api/prediction/bets`，幂等键），
// 通过后用同一幂等键从主钱包扣一次（`pd:<betId>`，刷新重放不会二次扣款），
// 再写一条 kind `bet`、event `prediction` 的本地记录（`brand:prediction-records`）并广播，
// 让账页的历史表在页面打开时就显示这张票（同 T63/T65/T67 的入账模式）。
// 客户端安全：不 import 任何服务端模块（服务端 store 带 node:crypto / node:fs）。
import { walletService } from '@/lib/api/wallet';
import { announceRecords, readRecordList } from '@/lib/mock-records';
import { PREDICTION_EVENT, type Pick } from '@/lib/prediction-rules';
import type { HistoryRow } from '@/lib/api/schemas';

export const PREDICTION_RECORDS_KEY = 'brand:prediction-records';

/** One history row of the bet kind, exactly the fixture's shape. */
export type PredictionRecord = { row: Extract<HistoryRow, { kind: 'bet' }> };

/** The ticket as the API answered it — the store's row minus the idempotency key. */
export type PlacedPredictionBet = {
  id: string;
  picks: {
    fixtureId: string;
    optionId: string;
    label: string;
    odds: number;
    league: string;
    home: string;
    away: string;
  }[];
  amountMinor: number;
  totalMinor: number;
  placedAt: string;
};

/** `210`…`216` are the store's rejections; `credit` and `network` are the client's own. */
export type PredictionFailure = '210' | '211' | '212' | '213' | '214' | '215' | '216' | 'credit' | 'network';

const STORE_CODES = ['210', '211', '212', '213', '214', '215', '216'] as const;

export class PredictionError extends Error {
  constructor(readonly code: PredictionFailure) {
    super(code);
  }
}

/** A retried submit must reuse its key so the server replays instead of double-booking. */
export function newBetKey(): string {
  return crypto.randomUUID();
}

/**
 * The reference's SUBMIT is one call to its backend; this build's is the mock
 * store plus the browser wallet it stands in for. The server accepts first — a
 * rejected slip never touches the balance.
 */
export async function placePrediction(draft: {
  picks: Pick[];
  amountMinor: number;
  idempotencyKey: string;
}): Promise<{ bet: PlacedPredictionBet; totalMinor: number }> {
  // The server would book the ticket before the wallet is consulted, so an
  // uncovered stake has to be refused here — that is what keeps a booked ticket
  // always paid.
  const enough = draft.amountMinor * draft.picks.length;
  if (walletService.totalMinor() < enough) throw new PredictionError('credit');

  let response: Response;
  try {
    response = await fetch('/api/prediction/bets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft),
    });
  } catch {
    throw new PredictionError('network');
  }

  const body = (await response.json().catch(() => null)) as
    | { status: string; msg: string; d: PlacedPredictionBet }
    | null;
  if (!body || body.status !== '0' || !body.d) {
    const code = body?.status;
    throw new PredictionError(
      STORE_CODES.includes(code as (typeof STORE_CODES)[number])
        ? (code as PredictionFailure)
        : 'network',
    );
  }

  const bet = body.d;

  // The stake leaves the main wallet once: the key is the ticket's own id, so a
  // reload that replays this call cannot charge twice.
  if (walletService.totalMinor() < bet.totalMinor) throw new PredictionError('credit');
  await walletService.withdraw(bet.totalMinor, `pd:${bet.id}`);
  writeBetRecord(bet);
  return { bet, totalMinor: bet.totalMinor };
}

/** The history row the ticket lands in: 项数, 流水, 输赢 (−stake — a placed ticket has not won yet). */
export function betRow(bet: PlacedPredictionBet): Extract<HistoryRow, { kind: 'bet' }> {
  return {
    id: `pd-${bet.id}`,
    kind: 'bet',
    at: bet.placedAt,
    event: PREDICTION_EVENT,
    transactions: bet.picks.length,
    turnoverMinor: bet.totalMinor,
    winLoseMinor: -bet.totalMinor,
    realBetMinor: bet.totalMinor,
  };
}

function writeBetRecord(bet: PlacedPredictionBet): void {
  const rows = readPredictionRecords();
  if (rows.some((record) => record.row.id === `pd-${bet.id}`)) return;
  persist([{ row: betRow(bet) }, ...rows]);
  announceRecords();
}

function persist(records: PredictionRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREDICTION_RECORDS_KEY, JSON.stringify(records));
}

/** Rows written by this browser, newest first — merged into the history page. */
export function readPredictionRecords(): PredictionRecord[] {
  return readRecordList(PREDICTION_RECORDS_KEY) as PredictionRecord[];
}
