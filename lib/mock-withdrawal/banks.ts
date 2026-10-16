// MOCK-ONLY: 成员已绑定银行账户库（Banking Details 页与提现页共用一份）。账户写 .mock-data/bank-accounts.json（目录已 .gitignore），文件不存在时用 mocks/bank-accounts.json 播种；每次调用重读文件——Next 给路由和页面各建模块图，缓存副本会漏掉另一个图刚写的改动。接后台后整个文件删除：读写换成 a/getMyBankAccVerified + a/setBankAccount + 删除接口（T59 的联动也在那之后）。
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import seed from '@/mocks/bank-accounts.json';
import { MAX_BOUND_ACCOUNTS, normalizeAccountNumber } from '@/lib/withdrawal-flow';

/** One bound account. The number is kept whole; the pages only ever print the last four. */
export type BoundBankAccount = {
  id: string;
  bankId: string;
  accountName: string;
  /** Digits only (the form strips separators before it gets here). */
  accountNumber: string;
  verified: boolean;
  /** Pre-selected for withdrawal; exactly one account carries it while the list is non-empty. */
  isDefault: boolean;
  addedAt: string;
};

export type BankAccountDraft = {
  bankId: string;
  accountName: string;
  accountNumber: string;
};

export type CreateResult = { ok: true; account: BoundBankAccount } | { ok: false; reason: 'limit' | 'duplicate' };
export type UpdateResult =
  | { ok: true; account: BoundBankAccount }
  | { ok: false; reason: 'missing' | 'duplicate' };
export type RemoveResult =
  | { ok: true; account: BoundBankAccount; defaultId: string | null }
  | { ok: false; reason: 'missing' };

export interface BankAccountStore {
  list(): Promise<BoundBankAccount[]>;
  create(input: BankAccountDraft): Promise<CreateResult>;
  update(
    id: string,
    patch: Partial<BankAccountDraft> & { isDefault?: boolean },
  ): Promise<UpdateResult>;
  remove(id: string): Promise<RemoveResult>;
}

/** The seeded demo accounts, shaped like a captured payload so the file reads like the others. */
export const seedAccounts = seed.d.accounts as BoundBankAccount[];

/**
 * `file: null` keeps the accounts in memory (tests). With a file path they
 * survive dev-server restarts; the file is seeded on first read and only written
 * on a mutation. Every call re-reads — see the header.
 */
export function createBankAccountStore({
  file,
  seedAccounts: initial = seedAccounts,
  now = () => Date.now(),
}: {
  file: string | null;
  seedAccounts?: BoundBankAccount[];
  now?: () => number;
}): BankAccountStore {
  let memory: BoundBankAccount[] | null = null;
  const clone = () => initial.map((account) => ({ ...account }));

  async function load(): Promise<BoundBankAccount[]> {
    if (!file) {
      memory ??= clone();
      return memory;
    }
    try {
      return JSON.parse(await readFile(file, 'utf8')) as BoundBankAccount[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return clone();
      throw error;
    }
  }

  async function save(list: BoundBankAccount[]): Promise<void> {
    if (!file) {
      memory = list;
      return;
    }
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
    await rename(tmp, file);
  }

  /** The account number is the identity the reference rejects duplicates on (its error 205). */
  const sameNumber = (list: BoundBankAccount[], accountNumber: string, exceptId?: string) =>
    list.some((account) => account.id !== exceptId && account.accountNumber === accountNumber);

  return {
    async list() {
      return load();
    },

    async create(input) {
      const list = await load();
      if (list.length >= MAX_BOUND_ACCOUNTS) return { ok: false, reason: 'limit' };

      const accountNumber = normalizeAccountNumber(input.accountNumber);
      if (sameNumber(list, accountNumber)) return { ok: false, reason: 'duplicate' };

      const account: BoundBankAccount = {
        id: `ba_${randomBytes(6).toString('hex')}`,
        bankId: input.bankId,
        accountName: input.accountName.trim(),
        accountNumber,
        // The reference shows a fresh account as Pending until its receipt check
        // lands (its `bank_pending` status), so it is not withdrawal-ready yet.
        verified: false,
        isDefault: list.length === 0,
        addedAt: new Date(now()).toISOString(),
      };
      list.push(account);
      await save(list);
      return { ok: true, account };
    },

    async update(id, patch) {
      const list = await load();
      const account = list.find((entry) => entry.id === id);
      if (!account) return { ok: false, reason: 'missing' };

      if (patch.accountNumber !== undefined) {
        const accountNumber = normalizeAccountNumber(patch.accountNumber);
        if (sameNumber(list, accountNumber, id)) return { ok: false, reason: 'duplicate' };
        account.accountNumber = accountNumber;
      }
      if (patch.bankId !== undefined) account.bankId = patch.bankId;
      if (patch.accountName !== undefined) account.accountName = patch.accountName.trim();
      if (patch.isDefault === true) {
        for (const entry of list) entry.isDefault = entry.id === id;
      }

      await save(list);
      return { ok: true, account };
    },

    async remove(id) {
      const list = await load();
      const index = list.findIndex((entry) => entry.id === id);
      if (index < 0) return { ok: false, reason: 'missing' };

      const [account] = list.splice(index, 1);
      // Dropping the default account hands the badge to the first one left, so
      // the withdrawal picker always has a pre-selection while accounts exist.
      if (account.isDefault && list.length > 0) list[0].isDefault = true;
      await save(list);

      return {
        ok: true,
        account,
        defaultId: list.find((entry) => entry.isDefault)?.id ?? null,
      };
    },
  };
}

export const bankAccountStore = createBankAccountStore({
  file:
    process.env.MOCK_BANK_ACCOUNTS_FILE || join(process.cwd(), '.mock-data', 'bank-accounts.json'),
});
