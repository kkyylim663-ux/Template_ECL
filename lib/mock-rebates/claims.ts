// MOCK-ONLY: 返水领取库（.mock-data/rebate-claims.json，与 lib/mock-withdrawal/requests.ts 同一文件库模式，每次重读；
// 播种 mocks/rebate-claims.json，镜像 fixture 里那条已领取的 rb-3）。服务端规则：同一 rebateId 只能领一次（→'409'）、
// 低于最低发放额不能领（→'210'）、同一幂等键只建一条（重放返回原记录）。余额不在这里动：钱包是前端 mock（lib/api/wallet.ts），
// 由提交成功的客户端用同一幂等键入账（lib/rebate-claim.ts）。接后台后整个文件删除，换成 a/claimRebate(V2)。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import seed from '@/mocks/rebate-claims.json';

export type RebateClaim = {
  id: string;
  rebateId: string;
  idempotencyKey: string;
  period: string;
  product: string;
  turnoverMinor: number;
  ratePct: number;
  amountMinor: number;
  reference: string;
  claimedAt: string;
};

export type RebateClaimDraft = Omit<RebateClaim, 'id' | 'reference' | 'claimedAt'>;

export type ClaimContext = {
  minPayoutMinor: number;
  now: Date;
};

/** `210`: below the reference's minimum payout. `409`: this rebate was already claimed. */
export type ClaimRejectCode = '210' | '409';

export type ClaimResult =
  | { ok: true; claim: RebateClaim; replayed: boolean }
  | { ok: false; code: ClaimRejectCode };

export interface RebateClaimStore {
  list(): Promise<RebateClaim[]>;
  claim(draft: RebateClaimDraft, context: ClaimContext): Promise<ClaimResult>;
}

/** The seeded demo claims, mirroring the fixture's already-claimed `rb-3`. */
export const seedClaims = seed as RebateClaim[];

/**
 * `file: null` keeps the claims in memory (tests). With a file path they survive
 * dev-server restarts; the file is seeded on first read and only written on a
 * claim. Every call re-reads — see the header.
 */
export function createRebateClaimStore({
  file,
  seedClaims: initial = seedClaims,
}: {
  file: string | null;
  seedClaims?: RebateClaim[];
}): RebateClaimStore {
  let memory: RebateClaim[] | null = null;
  const clone = () => initial.map((claim) => ({ ...claim }));

  async function load(): Promise<RebateClaim[]> {
    if (!file) {
      memory ??= clone();
      return memory;
    }
    try {
      return JSON.parse(await readFile(file, 'utf8')) as RebateClaim[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return clone();
      throw error;
    }
  }

  async function save(list: RebateClaim[]): Promise<void> {
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

      if (list.some((entry) => entry.rebateId === draft.rebateId)) return { ok: false, code: '409' };
      if (draft.amountMinor < context.minPayoutMinor) return { ok: false, code: '210' };

      const claim: RebateClaim = {
        ...draft,
        id: `rc_${randomBytes(6).toString('hex')}`,
        reference: `RB-${context.now.getTime().toString(36).toUpperCase()}`,
        claimedAt: context.now.toISOString(),
      };
      list.unshift(claim);
      await save(list.slice(0, 500));
      return { ok: true, claim, replayed: false };
    },
  };
}

export const rebateClaimStore = createRebateClaimStore({
  file: process.env.MOCK_REBATE_CLAIMS_FILE || join(process.cwd(), '.mock-data', 'rebate-claims.json'),
});
