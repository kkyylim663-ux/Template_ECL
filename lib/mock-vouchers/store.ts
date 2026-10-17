// MOCK-ONLY: 礼券库（T66）——已兑换的礼券码一张表，写 `.mock-data/voucher-store.json`
// （不存在时用 mocks/voucher-store.json 播种；MOCK_VOUCHER_STORE_FILE 可换库文件），
// 与 lib/mock-tickets/store.ts 同一文件库模式，每次重读。
// 服务端规则（顺序）：同一幂等键重放 → 原记录；码不在码表 → '404'；同一码已兑换 → '409'；
// 码不在窗口内（未开始/已过期）→ '410'；码的库存已发完 → '411'。
// 接后台后整个文件删除，换成 a/bonusAction（原站自己的兑换接口）。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import seed from '@/mocks/voucher-store.json';
import codes from '@/mocks/voucher-codes.json';
import {
  normalizeVoucherCode,
  voucherAvailability,
  vouchersLeft,
  type VoucherOffer,
} from '@/lib/voucher-rules';

/** The code catalogue the redeem route hands to `redeem()`. */
export const voucherCodeCatalogue = codes as VoucherOffer[];

export type VoucherRedemption = {
  id: string;
  code: string;
  amountMinor: number;
  /** The code's own expiry: the voucher lives exactly as long as the code window. */
  expiresAt: string;
  idempotencyKey: string;
  redeemedAt: string;
};

export type VoucherStoreSnapshot = { redemptions: VoucherRedemption[] };

/** `404`: unknown code. `409`: already redeemed. `410`: outside its window. `411`: no vouchers left. */
export type VoucherRejectCode = '404' | '409' | '410' | '411';

export type VoucherStoreResult<T> =
  { ok: true; entry: T; replayed: boolean; left: number } | { ok: false; code: VoucherRejectCode };

export type RedeemVoucherDraft = { code: string; idempotencyKey: string };
export type RedeemVoucherContext = { catalogue: VoucherOffer[]; now: Date };

export interface VoucherStore {
  read(): Promise<VoucherStoreSnapshot>;
  redeem(
    draft: RedeemVoucherDraft,
    context: RedeemVoucherContext,
  ): Promise<VoucherStoreResult<VoucherRedemption>>;
}

export const seedVoucherStore = seed as VoucherStoreSnapshot;

/**
 * `file: null` keeps the table in memory (tests). Every call re-reads the file so
 * a second process (or the e2e's own requests) sees the same state.
 */
export function createVoucherStore({
  file,
  storeSeed = seedVoucherStore,
}: {
  file: string | null;
  storeSeed?: VoucherStoreSnapshot;
}): VoucherStore {
  let memory: VoucherStoreSnapshot | null = null;
  const clone = (): VoucherStoreSnapshot => ({
    redemptions: storeSeed.redemptions.map((entry) => ({ ...entry })),
  });

  async function load(): Promise<VoucherStoreSnapshot> {
    if (!file) {
      memory ??= clone();
      return memory;
    }
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<VoucherStoreSnapshot>;
      return { redemptions: Array.isArray(parsed.redemptions) ? parsed.redemptions : [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return clone();
      throw error;
    }
  }

  async function save(snapshot: VoucherStoreSnapshot): Promise<void> {
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

    async redeem(draft, context) {
      const snapshot = await load();
      const code = normalizeVoucherCode(draft.code);
      const offer = context.catalogue.find((entry) => normalizeVoucherCode(entry.code) === code);
      const claimed = snapshot.redemptions.filter(
        (entry) => normalizeVoucherCode(entry.code) === code,
      ).length;

      // A retried submit reads back as the first one did, even though the code is
      // spent by then.
      const replay = snapshot.redemptions.find(
        (entry) => entry.idempotencyKey === draft.idempotencyKey,
      );
      if (replay) {
        return {
          ok: true,
          entry: replay,
          replayed: true,
          left: offer ? vouchersLeft(offer, claimed) : 0,
        };
      }

      if (!offer) return { ok: false, code: '404' };
      if (claimed > 0) return { ok: false, code: '409' };

      const availability = voucherAvailability(offer, claimed, context.now);
      if (availability === 'not-redeemable') return { ok: false, code: '410' };
      if (availability === 'finished') return { ok: false, code: '411' };

      const redemption: VoucherRedemption = {
        id: `vr_${randomBytes(6).toString('hex')}`,
        code,
        amountMinor: offer.amountMinor,
        expiresAt: offer.expiresAt,
        idempotencyKey: draft.idempotencyKey,
        redeemedAt: context.now.toISOString(),
      };
      snapshot.redemptions.unshift(redemption);
      await save({ redemptions: snapshot.redemptions.slice(0, 200) });
      return {
        ok: true,
        entry: redemption,
        replayed: false,
        left: vouchersLeft(offer, claimed + 1),
      };
    },
  };
}

export const voucherStore = createVoucherStore({
  file:
    process.env.MOCK_VOUCHER_STORE_FILE || join(process.cwd(), '.mock-data', 'voucher-store.json'),
});
