// MOCK-ONLY: 数字游戏投注单（T67）——写 `.mock-data/numbergame-bets.json`
// （不存在时用 mocks/numbergame-bets.json 播种；MOCK_NUMBERGAME_STORE_FILE 可换库文件），
// 与 lib/mock-vouchers/store.ts 同一文件库模式，每次重读。
// 服务端规则（顺序）：同一幂等键重放 → 原记录；没有一条满 6 个号的注 → '212'；
// 注数超过 MAX_LINES → '213'；金额低于下限 → '210'；高于上限 → '211'。
// 余额不在这里校验（钱包在浏览器，客户端先扣），接后台后由账户服务判定。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mockDataFile } from '@/lib/mock-data-dir';
import seed from '@/mocks/numbergame-bets.json';
import {
  MAX_BET_MINOR,
  MAX_LINES,
  MIN_BET_MINOR,
  completeLines,
  lineIssue,
  type BetDraft,
} from '@/lib/numbergame-rules';

export type NumberGameBet = {
  id: string;
  /** Ascending six-of-49 lines, exactly as the slip held them. */
  lines: number[][];
  /** Stake per line, in minor units. */
  amountMinor: number;
  totalMinor: number;
  idempotencyKey: string;
  placedAt: string;
};

export type NumberGameStoreSnapshot = { bets: NumberGameBet[] };

/** `210` stake below the minimum, `211` above the maximum, `212` no complete line, `213` too many lines. */
export type NumberGameRejectCode = '210' | '211' | '212' | '213';

export type NumberGameStoreResult<T> =
  | { ok: true; entry: T; replayed: boolean }
  | { ok: false; code: NumberGameRejectCode };

export type PlaceBetContext = { now: Date };

export interface NumberGameStore {
  read(): Promise<NumberGameStoreSnapshot>;
  place(draft: BetDraft, context: PlaceBetContext): Promise<NumberGameStoreResult<NumberGameBet>>;
}

export const seedNumberGameStore = seed as NumberGameStoreSnapshot;

/**
 * `file: null` keeps the table in memory (tests). Every call re-reads the file so
 * a second process (or the e2e's own requests) sees the same state.
 */
export function createNumberGameStore({
  file,
  storeSeed = seedNumberGameStore,
}: {
  file: string | null;
  storeSeed?: NumberGameStoreSnapshot;
}): NumberGameStore {
  let memory: NumberGameStoreSnapshot | null = null;
  const clone = (): NumberGameStoreSnapshot => ({
    bets: storeSeed.bets.map((entry) => ({ ...entry, lines: entry.lines.map((line) => [...line]) })),
  });

  async function load(): Promise<NumberGameStoreSnapshot> {
    if (!file) {
      memory ??= clone();
      return memory;
    }
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<NumberGameStoreSnapshot>;
      return { bets: Array.isArray(parsed.bets) ? parsed.bets : [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return clone();
      throw error;
    }
  }

  async function save(snapshot: NumberGameStoreSnapshot): Promise<void> {
    if (!file) {
      memory = snapshot;
      return;
    }
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(tmp, JSON.stringify(snapshot, null, 2), 'utf8');
    await rename(tmp, file);
  }

  return {
    async read() {
      return load();
    },

    async place(draft, context) {
      const snapshot = await load();

      // A retried submit reads back as the first one did.
      const replay = snapshot.bets.find(
        (entry) => entry.idempotencyKey === draft.idempotencyKey,
      );
      if (replay) return { ok: true, entry: replay, replayed: true };

      const lines = completeLines(draft.lines);
      if (lines.length === 0 || draft.lines.some((line) => lineIssue(line) !== null)) {
        return { ok: false, code: '212' };
      }
      if (lines.length > MAX_LINES) return { ok: false, code: '213' };
      if (draft.amountMinor < MIN_BET_MINOR) return { ok: false, code: '210' };
      if (draft.amountMinor > MAX_BET_MINOR) return { ok: false, code: '211' };

      const bet: NumberGameBet = {
        id: `ng_${randomBytes(6).toString('hex')}`,
        lines: lines.map((line) => [...line].sort((a, b) => a - b)),
        amountMinor: draft.amountMinor,
        totalMinor: lines.length * draft.amountMinor,
        idempotencyKey: draft.idempotencyKey,
        placedAt: context.now.toISOString(),
      };
      snapshot.bets.unshift(bet);
      await save({ bets: snapshot.bets.slice(0, 200) });
      return { ok: true, entry: bet, replayed: false };
    },
  };
}

export const numberGameStore = createNumberGameStore({
  file:
    process.env.MOCK_NUMBERGAME_STORE_FILE ||
    mockDataFile('numbergame-bets.json'),
});
