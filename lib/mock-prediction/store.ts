// MOCK-ONLY: 预测投注单（T68）——写 `.mock-data/prediction-bets.json`
// （不存在时用 mocks/prediction-bets.json 播种；MOCK_PREDICTION_STORE_FILE 可换库文件），
// 与 lib/mock-numbergame/store.ts 同一文件库模式，每次重读。
// 服务端规则（顺序）：同一幂等键重放 → 原记录；没有一项 → '212'；项数超过 MAX_PICKS → '213'；
// 找不到赛事 → '214'；赛事已结束 → '215'；找不到该选项 → '216'；
// 金额低于下限 → '210'；高于上限 → '211'。
// 余额不在这里校验（钱包在浏览器，客户端先扣），接后台后由账户服务判定。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mockDataFile } from '@/lib/mock-data-dir';
import seed from '@/mocks/prediction-bets.json';
import { MAX_PICKS, MAX_STAKE_MINOR, MIN_STAKE_MINOR, type PredictionBetDraft } from '@/lib/prediction-rules';
import type { PredictionFixture } from '@/lib/api/schemas';

/** The outcome a ticket holds, with the fixture's own terms snapshotted at entry. */
export type PredictionTicketPick = {
  fixtureId: string;
  optionId: string;
  /** The option's label ("Home" / "Draw" / "Away") as the card showed it. */
  label: string;
  /** The price at entry; the card's live price may move after this. */
  odds: number;
  league: string;
  home: string;
  away: string;
};

export type PredictionBet = {
  id: string;
  picks: PredictionTicketPick[];
  /** Stake per pick, in minor units. */
  amountMinor: number;
  totalMinor: number;
  idempotencyKey: string;
  placedAt: string;
};

export type PredictionStoreSnapshot = { bets: PredictionBet[] };

/** `210` stake below the minimum, `211` above it, `212` no pick, `213` too many picks, `214` unknown fixture, `215` fixture closed, `216` unknown outcome. */
export type PredictionRejectCode = '210' | '211' | '212' | '213' | '214' | '215' | '216';

export type PredictionStoreResult<T> =
  | { ok: true; entry: T; replayed: boolean }
  | { ok: false; code: PredictionRejectCode };

export type PlaceBetContext = { now: Date; fixtures: PredictionFixture[] };

export interface PredictionStore {
  read(): Promise<PredictionStoreSnapshot>;
  place(
    draft: PredictionBetDraft,
    context: PlaceBetContext,
  ): Promise<PredictionStoreResult<PredictionBet>>;
}

export const seedPredictionStore = seed as PredictionStoreSnapshot;

/**
 * `file: null` keeps the table in memory (tests). Every call re-reads the file so
 * a second process (or the e2e's own requests) sees the same state.
 */
export function createPredictionStore({
  file,
  storeSeed = seedPredictionStore,
}: {
  file: string | null;
  storeSeed?: PredictionStoreSnapshot;
}): PredictionStore {
  let memory: PredictionStoreSnapshot | null = null;
  const clone = (): PredictionStoreSnapshot => ({
    bets: storeSeed.bets.map((entry) => ({
      ...entry,
      picks: entry.picks.map((pick) => ({ ...pick })),
    })),
  });

  async function load(): Promise<PredictionStoreSnapshot> {
    if (!file) {
      memory ??= clone();
      return memory;
    }
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<PredictionStoreSnapshot>;
      return { bets: Array.isArray(parsed.bets) ? parsed.bets : [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return clone();
      throw error;
    }
  }

  async function save(snapshot: PredictionStoreSnapshot): Promise<void> {
    if (!file) {
      memory = snapshot;
      return;
    }
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
    await writeFile(temp, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    await rename(temp, file);
  }

  /** The fixture the pick points at, or the code that refuses it. */
  function resolvePick(
    fixtures: Map<string, PredictionFixture>,
    pick: { fixtureId: string; optionId: string },
  ): { ok: true; entry: PredictionTicketPick } | { ok: false; code: PredictionRejectCode } {
    const fixture = fixtures.get(pick.fixtureId);
    if (!fixture) return { ok: false, code: '214' };
    if (fixture.status === 'ended') return { ok: false, code: '215' };
    const option = fixture.options.find((entry) => entry.id === pick.optionId);
    if (!option) return { ok: false, code: '216' };
    return {
      ok: true,
      entry: {
        fixtureId: fixture.id,
        optionId: option.id,
        label: option.label,
        odds: option.odds,
        league: fixture.league,
        home: fixture.home,
        away: fixture.away,
      },
    };
  }

  return {
    read: load,

    async place(draft, context) {
      const snapshot = await load();
      const replayed = snapshot.bets.find((entry) => entry.idempotencyKey === draft.idempotencyKey);
      if (replayed) return { ok: true, entry: replayed, replayed: true };

      if (draft.picks.length === 0) return { ok: false, code: '212' };
      if (draft.picks.length > MAX_PICKS) return { ok: false, code: '213' };

      const fixtures = new Map(context.fixtures.map((fixture) => [fixture.id, fixture]));
      const picks: PredictionTicketPick[] = [];
      for (const pick of draft.picks) {
        const resolved = resolvePick(fixtures, pick);
        if (!resolved.ok) return resolved;
        picks.push(resolved.entry);
      }

      if (draft.amountMinor < MIN_STAKE_MINOR) return { ok: false, code: '210' };
      if (draft.amountMinor > MAX_STAKE_MINOR) return { ok: false, code: '211' };

      const entry: PredictionBet = {
        id: `pd-${randomBytes(8).toString('hex')}`,
        picks,
        amountMinor: draft.amountMinor,
        totalMinor: picks.length * draft.amountMinor,
        idempotencyKey: draft.idempotencyKey,
        placedAt: context.now.toISOString(),
      };

      await save({ bets: [entry, ...snapshot.bets] });
      return { ok: true, entry, replayed: false };
    },
  };
}

/** The store the routes use: the file library under `.mock-data`. */
export const predictionStore = createPredictionStore({
  file:
    process.env.MOCK_PREDICTION_STORE_FILE ??
    mockDataFile('prediction-bets.json'),
});
