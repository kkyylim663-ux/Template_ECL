import { describe, expect, it } from 'vitest';
import { createWalletService, WalletError, type Wallet } from '@/lib/api/wallet';

const instant = { wait: async () => {} };

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

const balance = (wallets: Wallet[], code: string) => wallets.find((w) => w.code === code)!.amountMinor;
const total = (wallets: Wallet[]) => wallets.reduce((sum, w) => sum + w.amountMinor, 0);

describe('per-account wallets', () => {
  it('gives a registered account zero balances in every wallet', async () => {
    const service = createWalletService({ storage: null, ...instant });
    service.bindAccount('u_new', 'zero');
    const wallets = await service.getWallets();
    expect(wallets.length).toBeGreaterThanOrEqual(7);
    expect(wallets.every((w) => w.amountMinor === 0)).toBe(true);
    expect(service.totalMinor()).toBe(0);
    expect(service.seedTotalMinor()).toBe(0);
  });

  it('keeps a preset account and a registered account apart', async () => {
    const storage = memoryStorage();
    const service = createWalletService({ storage, ...instant });
    const presetBefore = await service.getWallets();
    await service.transfer('main', 'pt', 700);

    service.bindAccount('u_new', 'zero');
    expect(balance(await service.getWallets(), 'main')).toBe(0);
    await expect(service.transfer('main', 'pt', 1)).rejects.toMatchObject({ code: 'insufficient' });

    service.bindAccount(null);
    const presetAfter = await service.getWallets();
    expect(balance(presetAfter, 'main')).toBe(balance(presetBefore, 'main') - 700);
    expect(balance(presetAfter, 'pt')).toBe(700);
    expect(storage.getItem('brand:wallets:acct:u_new')).toBeNull();
  });

  it('restores a registered account from its own storage on the next bind', async () => {
    const storage = memoryStorage();
    const service = createWalletService({ storage, ...instant });
    service.bindAccount('u_new', 'zero');
    await service.deposit(5_000);
    service.bindAccount(null);
    service.bindAccount('u_other', 'zero');
    expect(balance(await service.getWallets(), 'main')).toBe(0);

    service.bindAccount('u_new', 'zero');
    expect(balance(await service.getWallets(), 'main')).toBe(5_000);
    expect(service.ledger()).toHaveLength(1);
  });

  it('gives a fresh service the zero opening after a restart', async () => {
    const storage = memoryStorage();
    createWalletService({ storage, ...instant }).bindAccount('u_new', 'zero');
    const restarted = createWalletService({ storage, ...instant });
    restarted.bindAccount('u_new', 'zero');
    expect(total(await restarted.getWallets())).toBe(0);
  });

  it('resets a registered account to zero, not to the seed', async () => {
    const service = createWalletService({ storage: memoryStorage(), ...instant });
    service.bindAccount('u_new', 'zero');
    await service.deposit(900);
    service.reset();
    expect(total(await service.getWallets())).toBe(0);
    expect(service.ledger()).toEqual([]);
  });

  it('does not let a transfer started before the switch land in the new account', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const service = createWalletService({ storage: null, wait: () => gate, random: () => 0 });
    const pending = service.transfer('main', 'pt', 1_000).then(
      () => null,
      (error: unknown) => error,
    );

    service.bindAccount('u_new', 'zero');
    release();

    expect(await pending).toBeInstanceOf(WalletError);
    expect(total(await service.getWallets())).toBe(0);
  });

  it('does not let a deposit started before the switch land in the new account', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const service = createWalletService({ storage: null, wait: () => gate, random: () => 0 });
    const pending = service.deposit(2_000).then(
      () => null,
      (error: unknown) => error,
    );

    service.bindAccount('u_new', 'zero');
    release();

    expect(await pending).toBeInstanceOf(WalletError);
    expect(service.ledger()).toEqual([]);
  });
});
