// MOCK-ONLY: 演示会员库。预设账号来自 mocks/users.json（明文，只读）；注册新建的账号写入 .mock-data/users.json（scrypt 哈希，目录已加入 .gitignore）。接后台后整个文件删除，改调真实注册/登录接口。
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mockDataFile } from '@/lib/mock-data-dir';
import fixtureUsers from '@/mocks/users.json';

export type WalletOpening = 'seed' | 'zero';

export type Account = {
  id: string;
  username: string;
  email: string;
  phone: string;
  /** Mock SMS / OTP code. Registered accounts get the fixed mock code. */
  otp: string;
  /** Preset fixtures start from the seeded wallets; registered accounts start at zero. */
  walletOpening: WalletOpening;
  /** Plain text, preset fixtures only. */
  password?: string;
  /** `scrypt$<salt>$<key>` for accounts created by registration. */
  passwordHash?: string;
  fullName?: string;
  nickname?: string;
};

export type TakenField = 'username' | 'email' | 'mobile';

export type NewAccount = {
  username: string;
  email: string;
  /** Digits with the dial code, e.g. "+60123456789". */
  phone: string;
  password: string;
  fullName: string;
  nickname: string;
  otp: string;
};

export type CreateResult = { ok: true; account: Account } | { ok: false; field: TakenField };

export interface AccountStore {
  findByIdentifier(identifier: string): Promise<Account | undefined>;
  getById(id: string): Promise<Account | undefined>;
  takenField(check: { username?: string; email?: string; phone?: string }): Promise<TakenField | null>;
  verifyPassword(account: Account, password: string): Promise<boolean>;
  setPassword(id: string, password: string): Promise<boolean>;
  create(input: NewAccount): Promise<CreateResult>;
}

const digits = (value: string) => value.replace(/\D/g, '');

const scrypt = (password: string, salt: Buffer, keylen: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, keylen, (error, key) => (error ? reject(error) : resolve(key))),
  );

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyHash(stored: string, password: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(expected, actual);
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function findTaken(
  list: Account[],
  check: { username?: string; email?: string; phone?: string },
): TakenField | null {
  const name = check.username?.trim().toLowerCase();
  if (name && list.some((a) => a.username.toLowerCase() === name)) return 'username';
  const mail = check.email?.trim().toLowerCase();
  if (mail && list.some((a) => a.email.toLowerCase() === mail)) return 'email';
  const tel = check.phone ? digits(check.phone) : '';
  if (tel && list.some((a) => digits(a.phone) === tel)) return 'mobile';
  return null;
}

/**
 * `file: null` keeps registered accounts in memory (tests). With a file path they
 * are written there, so a dev-server restart keeps them. The file is re-read on
 * every call: Next can load route handlers in separate module graphs, and a cached
 * copy in one of them would miss an account another one just registered.
 */
export function createAccountStore({
  file,
  fixtures,
}: {
  file: string | null;
  fixtures: Account[];
}): AccountStore {
  let memory: Account[] = [];
  /** Passwords changed on a preset fixture. The fixture JSON is read-only, so this lives in memory. */
  const fixturePasswords = new Map<string, string>();
  const fixtureIds = new Set(fixtures.map((a) => a.id));

  async function load(): Promise<Account[]> {
    if (!file) return memory;
    try {
      return JSON.parse(await readFile(file, 'utf8')) as Account[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async function save(list: Account[]): Promise<void> {
    if (!file) {
      memory = list;
      return;
    }
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
    await rename(tmp, file);
  }

  const everyone = async () => [...fixtures, ...(await load())];

  return {
    async findByIdentifier(identifier) {
      const needle = identifier.trim().toLowerCase();
      const tel = digits(identifier);
      return (await everyone()).find(
        (a) =>
          a.username.toLowerCase() === needle ||
          a.email.toLowerCase() === needle ||
          (tel !== '' && digits(a.phone) === tel),
      );
    },

    async getById(id) {
      return (await everyone()).find((a) => a.id === id);
    },

    async takenField(check) {
      return findTaken(await everyone(), check);
    },

    async verifyPassword(account, password) {
      const override = fixturePasswords.get(account.id);
      if (override !== undefined) return sameText(override, password);
      if (account.passwordHash) return verifyHash(account.passwordHash, password);
      return account.password !== undefined && sameText(account.password, password);
    },

    async setPassword(id, password) {
      if (fixtureIds.has(id)) {
        fixturePasswords.set(id, password);
        return true;
      }
      const list = await load();
      const account = list.find((a) => a.id === id);
      if (!account) return false;
      account.passwordHash = await hashPassword(password);
      delete account.password;
      await save(list);
      return true;
    },

    async create(input) {
      // Hash before the read-check-push block: nothing in that block awaits, so two
      // registrations for the same username cannot both pass the duplicate check.
      const passwordHash = await hashPassword(input.password);
      const list = await load();
      const taken = findTaken([...fixtures, ...list], input);
      if (taken) return { ok: false, field: taken };

      const account: Account = {
        id: `u_${randomBytes(6).toString('hex')}`,
        username: input.username,
        email: input.email,
        phone: input.phone,
        otp: input.otp,
        walletOpening: 'zero',
        passwordHash,
        fullName: input.fullName,
        nickname: input.nickname,
      };
      list.push(account);
      await save(list);
      return { ok: true, account };
    },
  };
}

const fixtures: Account[] = (fixtureUsers as Omit<Account, 'walletOpening'>[]).map((user) => ({
  ...user,
  walletOpening: 'seed' as const,
}));

export const accountStore = createAccountStore({
  file: process.env.MOCK_USERS_FILE || mockDataFile('users.json'),
  fixtures,
});
