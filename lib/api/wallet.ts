import walletSeed from '@/mocks/wallet.json';

/**
 * Mock wallet service for the member area. Every amount is an integer count of
 * minor units; no float arithmetic happens on money. State lives in memory and
 * is mirrored to localStorage so a refresh keeps balances; `reset()` (logout)
 * restores the seed and clears the mirror.
 */
export type WalletKind = 'main' | 'game';

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
 * `total = seed + Σ deposits − Σ withdrawals` (transfers are neutral).
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
  /** The seeded total, the invariant's baseline. */
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

function loadWallets(storage: WalletServiceOptions['storage']): Map<string, Wallet> {
  const wallets = new Map(seedWallets.map((w) => [w.code, { ...w }]));
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) return wallets;
  try {
    const saved: unknown = JSON.parse(raw);
    if (Array.isArray(saved)) {
      for (const item of saved) {
        if (isWallet(item) && wallets.has(item.code)) {
          wallets.get(item.code)!.amountMinor = item.amountMinor;
        }
      }
    }
  } catch {
    // A corrupt mirror falls back to the seed rather than blocking the page.
  }
  return wallets;
}

function loadLedger(storage: WalletServiceOptions['storage']): LedgerEntry[] {
  const raw = storage?.getItem(LEDGER_KEY);
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

  let wallets = loadWallets(storage);
  let ledger = loadLedger(storage);
  const completed = new Map<string, TransferReceipt>();
  const inFlight = new Map<string, Promise<TransferReceipt>>();
  const completedOps = new Map<string, LedgerEntry>();
  const inFlightOps = new Map<string, Promise<LedgerEntry>>();

  function persist() {
    storage?.setItem(STORAGE_KEY, JSON.stringify([...wallets.values()]));
  }

  function record(entry: Omit<LedgerEntry, 'id' | 'at'>): LedgerEntry {
    const full: LedgerEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), ...entry };
    ledger = [full, ...ledger];
    storage?.setItem(LEDGER_KEY, JSON.stringify(ledger));
    return full;
  }

  function snapshot(): Wallet[] {
    return [...wallets.values()].map((w) => ({ ...w }));
  }

  function delay(): Promise<void> {
    const ms = MIN_DELAY_MS + Math.floor(random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
    return wait(ms);
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
  ): Promise<LedgerEntry> {
    const replay = completedOps.get(idempotencyKey);
    if (replay) return replay;
    const pending = inFlightOps.get(idempotencyKey);
    if (pending) return pending;

    const work = (async () => {
      await delay();
      if (shouldFail()) throw new WalletError('network');
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
  ): Promise<TransferReceipt> {
    const replay = completed.get(idempotencyKey);
    if (replay) return replay;
    const pending = inFlight.get(idempotencyKey);
    if (pending) return pending;

    const work = (async () => {
      await delay();
      if (shouldFail()) throw new WalletError('network');
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
      const sources = [...wallets.values()].filter(
        (w) => w.code !== to && w.available && w.amountMinor > 0,
      );
      const receipts: TransferReceipt[] = [];
      for (const source of sources) {
        receipts.push(
          await runTransfer(source.code, to, source.amountMinor, `${idempotencyKey}:${source.code}`),
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

    seedTotalMinor() {
      return seedWallets.reduce((sum, wallet) => sum + wallet.amountMinor, 0);
    },

    reset() {
      wallets = loadWallets(null);
      ledger = [];
      completed.clear();
      inFlight.clear();
      completedOps.clear();
      inFlightOps.clear();
      storage?.removeItem(STORAGE_KEY);
      storage?.removeItem(LEDGER_KEY);
    },
  };
}

export const walletService = createWalletService();
