// MOCK-ONLY: 提现申请库（.mock-data/withdrawal-requests.json，与 banks.ts 同一文件库模式，每次重读）。服务端规则照原站 a/makeWithdrawal：限额（210 低于下限 / 211 高于上限）、未处理单（212）、每日次数（501）、已绑定且已验证的账户（201），外加本构建的流水门（213，原站未给数字码）。余额不在这里判断：钱包是前端 mock（lib/api/wallet.ts），由提交成功后用同一幂等键扣减。同一幂等键只建一笔。接后台后整个文件删除，换成 a/makeWithdrawal(V2)。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mockDataFile } from '@/lib/mock-data-dir';

/** Daily cap on submitted requests (the reference's 501 "Exceed Daily Limit"); this build's figure. */
export const MAX_WITHDRAWALS_PER_DAY = 3;

/** T59 moves a request from pending to success or failed; the holds check only the pending state. */
export type WithdrawalStatus = 'pending' | 'success' | 'failed';

export type WithdrawalRequest = {
  id: string;
  reference: string;
  idempotencyKey: string;
  bankAccountId: string;
  methodLabel: string;
  amountMinor: number;
  status: WithdrawalStatus;
  createdAt: string;
};

export type RequestDraft = {
  idempotencyKey: string;
  bankAccountId: string;
  methodLabel: string;
  amountMinor: number;
};

export type RequestContext = {
  limits: { minAmountMinor: number; maxAmountMinor: number };
  verifiedAccountIds: string[];
  turnoverRemainingMinor: number;
  maxPerDay: number;
  now: Date;
};

/** The reject codes: the reference's own for 201/210/211/212/501, and 213 for this build's turnover gate. */
export type RequestRejectCode = '201' | '210' | '211' | '212' | '213' | '501';

export type CreateResult =
  | { ok: true; request: WithdrawalRequest; replayed: boolean }
  | { ok: false; code: RequestRejectCode };

export interface WithdrawalRequestStore {
  list(): Promise<WithdrawalRequest[]>;
  create(draft: RequestDraft, context: RequestContext): Promise<CreateResult>;
  /** Moves a pending request to a final state; finals never change again. */
  settle(id: string, status: Exclude<WithdrawalStatus, 'pending'>): Promise<SettleResult>;
}

export type SettleResult =
  | { ok: true; request: WithdrawalRequest; changed: boolean }
  | { ok: false; code: 'not_found' | 'already_final' };

/** Calendar day in Malaysia time, so the daily cap resets at local midnight. */
export function malaysiaDay(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

export function createWithdrawalRequestStore({ file }: { file: string | null }): WithdrawalRequestStore {
  let memory: WithdrawalRequest[] = [];

  async function load(): Promise<WithdrawalRequest[]> {
    if (!file) return memory;
    try {
      return JSON.parse(await readFile(file, 'utf8')) as WithdrawalRequest[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async function save(list: WithdrawalRequest[]): Promise<void> {
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

    async create(draft, context) {
      const list = await load();

      const replay = list.find((entry) => entry.idempotencyKey === draft.idempotencyKey);
      if (replay) return { ok: true, request: replay, replayed: true };

      if (!context.verifiedAccountIds.includes(draft.bankAccountId)) return { ok: false, code: '201' };
      if (draft.amountMinor < context.limits.minAmountMinor) return { ok: false, code: '210' };
      if (draft.amountMinor > context.limits.maxAmountMinor) return { ok: false, code: '211' };
      if (list.some((entry) => entry.status === 'pending')) return { ok: false, code: '212' };
      if (context.turnoverRemainingMinor > 0) return { ok: false, code: '213' };

      const today = malaysiaDay(context.now);
      const sentToday = list.filter((entry) => malaysiaDay(new Date(entry.createdAt)) === today);
      if (sentToday.length >= context.maxPerDay) return { ok: false, code: '501' };

      const request: WithdrawalRequest = {
        id: `wd_${randomBytes(6).toString('hex')}`,
        reference: `WD-${context.now.getTime().toString(36).toUpperCase()}`,
        idempotencyKey: draft.idempotencyKey,
        bankAccountId: draft.bankAccountId,
        methodLabel: draft.methodLabel,
        amountMinor: draft.amountMinor,
        status: 'pending',
        createdAt: context.now.toISOString(),
      };
      list.unshift(request);
      await save(list.slice(0, 500));
      return { ok: true, request, replayed: false };
    },

    async settle(id, status) {
      const list = await load();
      const entry = list.find((item) => item.id === id);
      if (!entry) return { ok: false, code: 'not_found' };
      if (entry.status !== 'pending') {
        return entry.status === status
          ? { ok: true, request: entry, changed: false }
          : { ok: false, code: 'already_final' };
      }
      entry.status = status;
      await save(list);
      return { ok: true, request: entry, changed: true };
    },
  };
}

export const withdrawalRequestStore = createWithdrawalRequestStore({
  file:
    process.env.MOCK_WITHDRAWAL_REQUESTS_FILE ||
    mockDataFile('withdrawal-requests.json'),
});
