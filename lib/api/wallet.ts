// MOCK-ONLY: 整个钱包服务是 mock：种子来自 mocks/wallet.json，状态写 localStorage，含 300–800ms 假延迟与可注入失败；还带演示用的 deposit/withdraw/ledger。每个账号一套钱包（bindAccount）。接后台后换成真实 walletTransfer/walletTransferAll（带幂等键）与余额接口。
import walletSeed from '@/mocks/wallet.json';

/**
 * Mock wallet service for the member area. Every amount is an integer count of
 * minor units; no float arithmetic happens on money. State lives in memory and
 * is mirrored to localStorage so a refresh keeps balances; `reset()` (logout)
 * restores the opening balances and clears the mirror.
 *
 * Each signed-in account has its own mirror (`bindAccount`). Guests and the
 * /dev/wallet simulator use the default mirror. A registered account opens at
 * zero in every wallet; a preset account opens at the seed.
 */
export type WalletKind = 'main' | 'game';

export type WalletOpening = 'seed' | 'zero';

export interface Wallet {
  code: string;
  name: string;
  kind: WalletKind;
  amountMinor: number;
  available: boolean;
}

export type WalletErrorCode =
  | 'invalid_amount'
  | 'same_wallet'
  | 'unknown_wallet'
  | 'unavailable'
  | 'insufficient'
  | 'network';

export class WalletError extends Error {
  readonly code: WalletErrorCode;

  constructor(code: WalletErrorCode) {
    super(code);
    this.name = 'WalletError';
    this.code = code;
  }
}

export interface TransferReceipt {
  idempotencyKey: string;
  from: string;
  to: string;
  amountMinor: number;
}

export type LedgerKind = 'deposit' | 'withdraw' | 'transfer';

/**
 * One money movement. Every wallet action appends here, which is what lets the
 * dev page show the ledger and hold the invariant
 * `total = opening + Σ deposits − Σ withdrawals` (transfers are neutral).
 */
export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  amountMinor: number;
  /** ISO timestamp. */
  at: string;
  from?: string;
  to?: string;
}

export interface WalletServiceOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  /** Resolves after the simulated network delay. Injected so tests run instantly. */
  wait?: (ms: number) => Promise<void>;
  /** Returns a number in [0, 1). Drives the 300–800 ms delay. */
  random?: () => number;
  /** Return true to make the next call fail with `network`. */
  shouldFail?: () => boolean;
}

export interface WalletService {
  getWallets(): Promise<Wallet[]>;
  transfer(
    from: string,
    to: string,
    amountMinor: number,
    idempotencyKey?: string,
  ): Promise<TransferReceipt>;
  transferAll(to: string, idempotencyKey?: string): Promise<TransferReceipt[]>;
  /** Mock-mode simulation of money entering the main wallet. */
  deposit(amountMinor: number, idempotencyKey?: string): Promise<LedgerEntry>;
  /** Mock-mode simulation of money leaving the main wallet (insufficient rejects). */
  withdraw(amountMinor: number, idempotencyKey?: string): Promise<LedgerEntry>;
  /** Newest first. */
  ledger(): LedgerEntry[];
  /** main + every game wallet, in minor units. The one number "total assets" shows. */
  totalMinor(): number;
  /** Wallets `transferAll(to)` will leave behind because they are under maintenance. */
  skippedByMaintenance(to: string): Wallet[];
  /** Mock-mode switch for a wallet's maintenance state (the dev page uses it). */
  setAvailable(code: string, available: boolean): void;
  /**
   * Switches to the wallet set of `accountId` (null = the default set for guests).
   * A no-op when that set is already active. Calls subscribers when it switches.
   */
  bindAccount(accountId: string | null, opening?: WalletOpening): void;
  /** Calls `listener` after every change to balances, availability or the ledger. */
  subscribe(listener: () => void): () => void;
  /** The opening total of the active wallet set, the invariant's baseline. */
  seedTotalMinor(): number;
  reset(): void;
}

const STORAGE_KEY = 'brand:wallets';
const LEDGER_KEY = 'brand:wallets:ledger';
const MAIN_CODE = 'main';
const MIN_DELAY_MS = 300;
const MAX_DELAY_MS = 800;

const seedWallets: Wallet[] = walletSeed.wallets as Wallet[];

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function browserStorage(): WalletServiceOptions['storage'] {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function scopeKeys(accountId: string | null) {
  if (!accountId) return { wallets: STORAGE_KEY, ledger: LEDGER_KEY };
  return {
    wallets: `${STORAGE_KEY}:acct:${accountId}`,
    ledger: `${LEDGER_KEY}:acct:${accountId}`,
  };
}

function openingWallets(opening: WalletOpening): Map<string, Wallet> {
  return new Map(
    seedWallets.map((w) => [w.code, { ...w, amountMinor: opening === 'zero' ? 0 : w.amountMinor }]),
  );
}

function isWallet(value: unknown): value is Wallet {
  if (typeof value !== 'object' || value === null) return false;
  const w = value as Record<string, unknown>;
  return (
    typeof w.code === 'string' &&
    typeof w.amountMinor === 'number' &&
    Number.isSafeInteger(w.amountMinor) &&
    w.amountMinor >= 0
  );
}

function loadWallets(
  storage: WalletServiceOptions['storage'],
  key: string,
  opening: WalletOpening,
): Map<string, Wallet> {
  const wallets = openingWallets(opening);
  const raw = storage?.getItem(key);
  if (!raw) return wallets;
  try {
    const saved: unknown = JSON.parse(raw);
    if (Array.isArray(saved)) {
      for (const item of saved) {
        if (isWallet(item) && wallets.has(item.code)) {
          const target = wallets.get(item.code)!;
          target.amountMinor = item.amountMinor;
          const saved = item as unknown as { available?: unknown };
          if (typeof saved.available === 'boolean') target.available = saved.available;
        }
      }
    }
  } catch {
    // A corrupt mirror falls back to the opening balances rather than blocking the page.
  }
  return wallets;
}

function loadLedger(storage: WalletServiceOptions['storage'], key: string): LedgerEntry[] {
  const raw = storage?.getItem(key);
  if (!raw) return [];
  try {
    const saved: unknown = JSON.parse(raw);
    if (Array.isArray(saved)) return saved.filter((item) => isLedgerEntry(item));
  } catch {
    // Same tolerance as the balance mirror: a corrupt ledger starts empty.
  }
  return [];
}

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.at === 'string' &&
    (entry.kind === 'deposit' || entry.kind === 'withdraw' || entry.kind === 'transfer') &&
    typeof entry.amountMinor === 'number' &&
    Number.isSafeInteger(entry.amountMinor) &&
    entry.amountMinor > 0
  );
}

export function createWalletService(options: WalletServiceOptions = {}): WalletService {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const wait = options.wait ?? defaultWait;
  const random = options.random ?? Math.random;
  const shouldFail = options.shouldFail ?? (() => false);

  let owner: string | null = null;
  let opening: WalletOpening = 'seed';
  let keys = scopeKeys(null);
  let wallets = loadWallets(storage, keys.wallets, opening);
  let ledger = loadLedger(storage, keys.ledger);
  const completed = new Map<string, TransferReceipt>();
  const inFlight = new Map<string, Promise<TransferReceipt>>();
  const completedOps = new Map<string, LedgerEntry>();
  const inFlightOps = new Map<string, Promise<LedgerEntry>>();

  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of [...listeners]) listener();
  }

  function persist() {
    storage?.setItem(keys.wallets, JSON.stringify([...wallets.values()]));
    notify();
  }

  function record(entry: Omit<LedgerEntry, 'id' | 'at'>): LedgerEntry {
    const full: LedgerEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), ...entry };
    ledger = [full, ...ledger];
    storage?.setItem(keys.ledger, JSON.stringify(ledger));
    return full;
  }

  function snapshot(): Wallet[] {
    return [...wallets.values()].map((w) => ({ ...w }));
  }

  function delay(): Promise<void> {
    const ms = MIN_DELAY_MS + Math.floor(random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
    return wait(ms);
  }

  /**
   * A request started under one account must not land in another: if the account
   * switched while it was waiting, it is treated as not completed.
   */
  function assertSameAccount(scope: string | null) {
    if (owner !== scope) throw new WalletError('network');
  }

  function requireWallet(code: string): Wallet {
    const wallet = wallets.get(code);
    if (!wallet) throw new WalletError('unknown_wallet');
    if (!wallet.available) throw new WalletError('unavailable');
    return wallet;
  }

  function applyTransfer(from: string, to: string, amountMinor: number): void {
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new WalletError('invalid_amount');
    }
    if (from === to) throw new WalletError('same_wallet');
    const source = requireWallet(from);
    const target = requireWallet(to);
    if (source.amountMinor < amountMinor) throw new WalletError('insufficient');
    source.amountMinor -= amountMinor;
    target.amountMinor += amountMinor;
    persist();
    record({ kind: 'transfer', amountMinor, from, to });
  }

  /** deposit / withdraw share one idempotent path; both move the main wallet. */
  async function runLedgerOp(
    kind: 'deposit' | 'withdraw',
    amountMinor: number,
    idempotencyKey: string,
    scope: string | null = owner,
  ): Promise<LedgerEntry> {
    const replay = completedOps.get(idempotencyKey);
    if (replay) return replay;
    const pending = inFlightOps.get(idempotencyKey);
    if (pending) return pending;

    const work = (async () => {
      await delay();
      if (shouldFail()) throw new WalletError('network');
      assertSameAccount(scope);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw new WalletError('invalid_amount');
      }
      const main = requireWallet(MAIN_CODE);
      if (kind === 'withdraw' && main.amountMinor < amountMinor) {
        throw new WalletError('insufficient');
      }
      main.amountMinor += kind === 'deposit' ? amountMinor : -amountMinor;
      persist();
      const entry = record(
        kind === 'deposit'
          ? { kind, amountMinor, to: MAIN_CODE }
          : { kind, amountMinor, from: MAIN_CODE },
      );
      completedOps.set(idempotencyKey, entry);
      return entry;
    })();

    inFlightOps.set(idempotencyKey, work);
    try {
      return await work;
    } finally {
      inFlightOps.delete(idempotencyKey);
    }
  }

  async function runTransfer(
    from: string,
    to: string,
    amountMinor: number,
    idempotencyKey: string,
    scope: string | null = owner,
  ): Promise<TransferReceipt> {
    const replay = completed.get(idempotencyKey);
    if (replay) return replay;
    const pending = inFlight.get(idempotencyKey);
    if (pending) return pending;

    const work = (async () => {
      await delay();
      if (shouldFail()) throw new WalletError('network');
      assertSameAccount(scope);
      applyTransfer(from, to, amountMinor);
      const receipt: TransferReceipt = { idempotencyKey, from, to, amountMinor };
      completed.set(idempotencyKey, receipt);
      return receipt;
    })();

    inFlight.set(idempotencyKey, work);
    try {
      return await work;
    } finally {
      inFlight.delete(idempotencyKey);
    }
  }

  return {
    async getWallets() {
      return snapshot();
    },

    transfer(from, to, amountMinor, idempotencyKey = crypto.randomUUID()) {
      return runTransfer(from, to, amountMinor, idempotencyKey);
    },

    async transferAll(to, idempotencyKey = crypto.randomUUID()) {
      const scope = owner;
      const sources = [...wallets.values()].filter(
        (w) => w.code !== to && w.available && w.amountMinor > 0,
      );
      const receipts: TransferReceipt[] = [];
      for (const source of sources) {
        receipts.push(
          await runTransfer(
            source.code,
            to,
            source.amountMinor,
            `${idempotencyKey}:${source.code}`,
            scope,
          ),
        );
      }
      return receipts;
    },

    deposit(amountMinor, idempotencyKey = crypto.randomUUID()) {
      return runLedgerOp('deposit', amountMinor, idempotencyKey);
    },

    withdraw(amountMinor, idempotencyKey = crypto.randomUUID()) {
      return runLedgerOp('withdraw', amountMinor, idempotencyKey);
    },

    ledger() {
      return ledger.map((entry) => ({ ...entry }));
    },

    totalMinor() {
      return [...wallets.values()].reduce((sum, wallet) => sum + wallet.amountMinor, 0);
    },

    skippedByMaintenance(to) {
      return [...wallets.values()]
        .filter((w) => w.code !== to && !w.available && w.amountMinor > 0)
        .map((w) => ({ ...w }));
    },

    setAvailable(code, available) {
      const wallet = wallets.get(code);
      if (!wallet) throw new WalletError('unknown_wallet');
      wallet.available = available;
      persist();
    },

    bindAccount(accountId, nextOpening = 'seed') {
      const nextOwner = accountId || null;
      if (nextOwner === owner) return;
      owner = nextOwner;
      opening = nextOpening;
      keys = scopeKeys(nextOwner);
      wallets = loadWallets(storage, keys.wallets, opening);
      ledger = loadLedger(storage, keys.ledger);
      completed.clear();
      inFlight.clear();
      completedOps.clear();
      inFlightOps.clear();
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    seedTotalMinor() {
      return [...openingWallets(opening).values()].reduce((sum, wallet) => sum + wallet.amountMinor, 0);
    },

    reset() {
      wallets = openingWallets(opening);
      ledger = [];
      completed.clear();
      inFlight.clear();
      completedOps.clear();
      inFlightOps.clear();
      storage?.removeItem(keys.wallets);
      storage?.removeItem(keys.ledger);
      notify();
    },
  };
}

export const walletService = createWalletService();
