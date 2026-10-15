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

function balance(wallets: Wallet[], code: string) {
  return wallets.find((w) => w.code === code)!.amountMinor;
}

describe('wallet service', () => {
  it('seeds at least six product wallets with integer minor-unit amounts', async () => {
    const service = createWalletService({ storage: null, ...instant });
    const wallets = await service.getWallets();
    expect(wallets.length).toBeGreaterThanOrEqual(7);
    for (const w of wallets) expect(Number.isSafeInteger(w.amountMinor)).toBe(true);
  });

  it('moves money between two wallets and keeps the total unchanged', async () => {
    const service = createWalletService({ storage: null, ...instant });
    const before = await service.getWallets();
    await service.transfer('main', 'pragmatic', 10_000);
    const after = await service.getWallets();
    expect(balance(after, 'main')).toBe(balance(before, 'main') - 10_000);
    expect(balance(after, 'pragmatic')).toBe(balance(before, 'pragmatic') + 10_000);
    const sum = (ws: Wallet[]) => ws.reduce((s, w) => s + w.amountMinor, 0);
    expect(sum(after)).toBe(sum(before));
  });

  it('rejects zero, negative and fractional amounts', async () => {
    const service = createWalletService({ storage: null, ...instant });
    await expect(service.transfer('main', 'pt', 0)).rejects.toMatchObject({ code: 'invalid_amount' });
    await expect(service.transfer('main', 'pt', -100)).rejects.toMatchObject({ code: 'invalid_amount' });
    await expect(service.transfer('main', 'pt', 1.5)).rejects.toMatchObject({ code: 'invalid_amount' });
  });

  it('rejects amounts above the source balance and leaves both wallets untouched', async () => {
    const service = createWalletService({ storage: null, ...instant });
    const before = await service.getWallets();
    const err = await service.transfer('pt', 'main', 1).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WalletError);
    expect((err as WalletError).code).toBe('insufficient');
    expect(await service.getWallets()).toEqual(before);
  });

  it('rejects a transfer from a wallet to itself', async () => {
    const service = createWalletService({ storage: null, ...instant });
    await expect(service.transfer('main', 'main', 100)).rejects.toMatchObject({ code: 'same_wallet' });
  });

  it('rejects unavailable and unknown wallets', async () => {
    const service = createWalletService({ storage: null, ...instant });
    await expect(service.transfer('main', 'jili', 100)).rejects.toMatchObject({ code: 'unavailable' });
    await expect(service.transfer('main', 'nope', 100)).rejects.toMatchObject({ code: 'unknown_wallet' });
  });

  it('applies two concurrent transfers with the same idempotency key only once', async () => {
    const service = createWalletService({ storage: null, ...instant });
    const before = balance(await service.getWallets(), 'main');
    const [a, b] = await Promise.all([
      service.transfer('main', 'pt', 500, 'key-1'),
      service.transfer('main', 'pt', 500, 'key-1'),
    ]);
    expect(a).toEqual(b);
    expect(balance(await service.getWallets(), 'main')).toBe(before - 500);
  });

  it('replays a completed idempotency key without moving money again', async () => {
    const service = createWalletService({ storage: null, ...instant });
    await service.transfer('main', 'pt', 500, 'key-2');
    const after = balance(await service.getWallets(), 'main');
    await service.transfer('main', 'pt', 500, 'key-2');
    expect(balance(await service.getWallets(), 'main')).toBe(after);
  });

  it('sums decimal amounts without float drift (0.1 + 0.2 case)', async () => {
    const service = createWalletService({ storage: null, ...instant });
    await service.transfer('main', 'pt', 10);
    await service.transfer('main', 'pt', 20);
    expect(balance(await service.getWallets(), 'pt')).toBe(30);
    expect(10 + 20).toBe(30);
  });

  it('transferAll empties every other available wallet into the target', async () => {
    const service = createWalletService({ storage: null, ...instant });
    const before = await service.getWallets();
    const total = before.filter((w) => w.code !== 'main' && w.available).reduce((s, w) => s + w.amountMinor, 0);
    const mainBefore = balance(before, 'main');
    await service.transferAll('main');
    const after = await service.getWallets();
    expect(balance(after, 'main')).toBe(mainBefore + total);
    for (const w of after) {
      if (w.code !== 'main' && w.available) expect(w.amountMinor).toBe(0);
    }
  });

  it('surfaces an injected failure as a network error without changing balances', async () => {
    const service = createWalletService({ storage: null, ...instant, shouldFail: () => true });
    const before = await service.getWallets();
    await expect(service.transfer('main', 'pt', 100)).rejects.toMatchObject({ code: 'network' });
    expect(await service.getWallets()).toEqual(before);
  });

  it('waits within the 300–800 ms window', async () => {
    const waited: number[] = [];
    const service = createWalletService({
      storage: null,
      wait: async (ms) => void waited.push(ms),
      random: () => 0,
    });
    await service.transfer('main', 'pt', 1);
    expect(waited[0]).toBe(300);
    const max = createWalletService({ storage: null, wait: async (ms) => void waited.push(ms), random: () => 0.999999 });
    await max.transfer('main', 'pt', 1);
    expect(waited[1]).toBeLessThanOrEqual(800);
  });

  it('keeps balances across instances through storage and clears them on reset', async () => {
    const storage = memoryStorage();
    const first = createWalletService({ storage, ...instant });
    await first.transfer('main', 'pt', 700);
    const second = createWalletService({ storage, ...instant });
    expect(balance(await second.getWallets(), 'pt')).toBe(700);
    second.reset();
    expect(balance(await second.getWallets(), 'pt')).toBe(0);
    expect(storage.getItem('brand:wallets')).toBeNull();
  });
});
