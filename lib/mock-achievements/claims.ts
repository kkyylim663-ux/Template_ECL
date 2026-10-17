// MOCK-ONLY: 成就领取库（.mock-data/achievement-claims.json，与 lib/mock-rebates/claims.ts 同一文件库模式，每次重读；
// 播种 mocks/achievement-claims.json —— 空数组，因为原站的已领取行在 fixture 里就已标 claimed，不产生领取记录）。
// 服务端规则：未达成（fixture status 不是 claimable）不能领（→'211'）、同一 achievementId 只能领一次（→'409'）、
// 同一幂等键只建一条（重放返回原记录）。余额不在这里动：钱包是前端 mock（lib/api/wallet.ts），
// 由提交成功的客户端用同一幂等键入账（lib/achievement-claim.ts）。接后台后整个文件删除，换成 a/claimAchievement。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import seed from '@/mocks/achievement-claims.json';

export type AchievementClaim = {
  id: string;
  achievementId: string;
  idempotencyKey: string;
  gameType: string;
  title: string;
  requirementMinor: number;
  rewardMinor: number;
  reference: string;
  claimedAt: string;
};

export type AchievementClaimDraft = Omit<AchievementClaim, 'id' | 'reference' | 'claimedAt'>;

export type AchievementClaimContext = {
  /** The fixture's status of the row being claimed; only `claimable` may pay out. */
  seedStatus: string;
  now: Date;
};

/** `211`: the achievement is not reached yet. `409`: it was already claimed. */
export type AchievementClaimRejectCode = '211' | '409';

export type AchievementClaimResult =
  | { ok: true; claim: AchievementClaim; replayed: boolean }
  | { ok: false; code: AchievementClaimRejectCode };

export interface AchievementClaimStore {
  list(): Promise<AchievementClaim[]>;
  claim(draft: AchievementClaimDraft, context: AchievementClaimContext): Promise<AchievementClaimResult>;
}

export const seedAchievementClaims = seed as AchievementClaim[];

/**
 * `file: null` keeps the claims in memory (tests). With a file path they survive
 * dev-server restarts; the file is seeded on first read and only written on a
 * claim. Every call re-reads — see the header.
 */
export function createAchievementClaimStore({
  file,
  seedClaims: initial = seedAchievementClaims,
}: {
  file: string | null;
  seedClaims?: AchievementClaim[];
}): AchievementClaimStore {
  let memory: AchievementClaim[] | null = null;
  const clone = () => initial.map((claim) => ({ ...claim }));

  async function load(): Promise<AchievementClaim[]> {
    if (!file) {
      memory ??= clone();
      return memory;
    }
    try {
      return JSON.parse(await readFile(file, 'utf8')) as AchievementClaim[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return clone();
      throw error;
    }
  }

  async function save(list: AchievementClaim[]): Promise<void> {
    if (!file) {
      memory = list;
      return;
    }
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
    await rename(tmp, file);
  }

  return {
    async list() {
      return load();
    },

    async claim(draft, context) {
      const list = await load();

      const replay = list.find((entry) => entry.idempotencyKey === draft.idempotencyKey);
      if (replay) return { ok: true, claim: replay, replayed: true };

      if (list.some((entry) => entry.achievementId === draft.achievementId)) return { ok: false, code: '409' };
      if (context.seedStatus !== 'claimable') return { ok: false, code: '211' };

      const claim: AchievementClaim = {
        ...draft,
        id: `ac_${randomBytes(6).toString('hex')}`,
        reference: `AC-${context.now.getTime().toString(36).toUpperCase()}`,
        claimedAt: context.now.toISOString(),
      };
      list.unshift(claim);
      await save(list.slice(0, 500));
      return { ok: true, claim, replayed: false };
    },
  };
}

export const achievementClaimStore = createAchievementClaimStore({
  file:
    process.env.MOCK_ACHIEVEMENT_CLAIMS_FILE ||
    join(process.cwd(), '.mock-data', 'achievement-claims.json'),
});
