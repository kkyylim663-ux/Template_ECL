// MOCK-ONLY: 票券库（T65）——兑换与使用两张表，写 `.mock-data/ticket-store.json`
// （不存在时用 mocks/ticket-store.json 播种；MOCK_TICKET_STORE_FILE 可换库文件），
// 与 lib/mock-achievements/claims.ts 同一文件库模式，每次重读。
// 服务端规则：兑换码不在码表 → '404'、同一码只能兑一次（→'409'）、码已过期（→'410'）；
// 使用票券：不存在的票 → '404'、同一张票只能花一次（→'409'）；同一幂等键重放返回原记录。
// 接后台后整个文件删除，换成 a/redeemTicketCode + a/useTicket。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mockDataFile } from '@/lib/mock-data-dir';
import seed from '@/mocks/ticket-store.json';
import codes from '@/mocks/ticket-codes.json';

export type TicketCode = { code: string; tickets: number; expiresAt: string };

/** The code catalogue the redeem route hands to `redeem()`. */
export const ticketCodeCatalogue = codes as TicketCode[];

export type TicketRedemption = {
  id: string;
  code: string;
  tickets: number;
  /** The code's own expiry: the tickets it hands out live exactly as long. */
  expiresAt: string;
  idempotencyKey: string;
  redeemedAt: string;
};

export type TicketSpend = {
  id: string;
  ticketId: string;
  eventId: string;
  eventName: string;
  idempotencyKey: string;
  spentAt: string;
};

export type TicketStoreSnapshot = { redemptions: TicketRedemption[]; spends: TicketSpend[] };

/** `404`: unknown code or ticket. `409`: already redeemed or already spent. `410`: expired code. */
export type TicketRejectCode = '404' | '409' | '410';

export type TicketStoreResult<T> =
  | { ok: true; entry: T; replayed: boolean }
  | { ok: false; code: TicketRejectCode };

export type RedeemDraft = { code: string; idempotencyKey: string };
export type RedeemContext = { catalogue: TicketCode[]; now: Date };
export type SpendDraft = { ticketId: string; eventId: string; eventName: string; idempotencyKey: string };
export type SpendContext = { availableIds: string[]; now: Date };

export interface TicketStore {
  read(): Promise<TicketStoreSnapshot>;
  redeem(draft: RedeemDraft, context: RedeemContext): Promise<TicketStoreResult<TicketRedemption>>;
  spend(draft: SpendDraft, context: SpendContext): Promise<TicketStoreResult<TicketSpend>>;
}

export const seedTicketStore = seed as TicketStoreSnapshot;

/**
 * `file: null` keeps both tables in memory (tests). Every call re-reads the file
 * so a second process (or the e2e's own requests) sees the same state.
 */
export function createTicketStore({
  file,
  storeSeed = seedTicketStore,
}: {
  file: string | null;
  storeSeed?: TicketStoreSnapshot;
}): TicketStore {
  let memory: TicketStoreSnapshot | null = null;
  const clone = (): TicketStoreSnapshot => ({
    redemptions: storeSeed.redemptions.map((entry) => ({ ...entry })),
    spends: storeSeed.spends.map((entry) => ({ ...entry })),
  });

  async function load(): Promise<TicketStoreSnapshot> {
    if (!file) {
      memory ??= clone();
      return memory;
    }
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<TicketStoreSnapshot>;
      return {
        redemptions: Array.isArray(parsed.redemptions) ? parsed.redemptions : [],
        spends: Array.isArray(parsed.spends) ? parsed.spends : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return clone();
      throw error;
    }
  }

  async function save(snapshot: TicketStoreSnapshot): Promise<void> {
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

      const replay = snapshot.redemptions.find((entry) => entry.idempotencyKey === draft.idempotencyKey);
      if (replay) return { ok: true, entry: replay, replayed: true };

      const code = draft.code.trim().toUpperCase();
      const offer = context.catalogue.find((entry) => entry.code.toUpperCase() === code);
      if (!offer) return { ok: false, code: '404' };
      if (snapshot.redemptions.some((entry) => entry.code.toUpperCase() === code)) {
        return { ok: false, code: '409' };
      }
      const expiresAt = new Date(offer.expiresAt).getTime();
      if (Number.isNaN(expiresAt) || expiresAt <= context.now.getTime()) return { ok: false, code: '410' };

      const redemption: TicketRedemption = {
        id: `tr_${randomBytes(6).toString('hex')}`,
        code,
        tickets: offer.tickets,
        expiresAt: offer.expiresAt,
        idempotencyKey: draft.idempotencyKey,
        redeemedAt: context.now.toISOString(),
      };
      snapshot.redemptions.unshift(redemption);
      await save({ ...snapshot, redemptions: snapshot.redemptions.slice(0, 200) });
      return { ok: true, entry: redemption, replayed: false };
    },

    async spend(draft, context) {
      const snapshot = await load();

      // The replay check comes first: after a spend the ticket is no longer
      // available, and a retried request must still read as the same spend.
      const replay = snapshot.spends.find((entry) => entry.idempotencyKey === draft.idempotencyKey);
      if (replay) return { ok: true, entry: replay, replayed: true };

      if (snapshot.spends.some((entry) => entry.ticketId === draft.ticketId)) return { ok: false, code: '409' };
      if (!context.availableIds.includes(draft.ticketId)) return { ok: false, code: '404' };

      const spend: TicketSpend = {
        id: `ts_${randomBytes(6).toString('hex')}`,
        ticketId: draft.ticketId,
        eventId: draft.eventId,
        eventName: draft.eventName,
        idempotencyKey: draft.idempotencyKey,
        spentAt: context.now.toISOString(),
      };
      snapshot.spends.unshift(spend);
      await save({ ...snapshot, spends: snapshot.spends.slice(0, 500) });
      return { ok: true, entry: spend, replayed: false };
    },
  };
}

export const ticketStore = createTicketStore({
  file: process.env.MOCK_TICKET_STORE_FILE || mockDataFile('ticket-store.json'),
});
