import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  creditDeposit,
  creditKey,
  isCreditable,
  readDepositRecords,
  type CreditableOrder,
} from '@/lib/deposit-credit';
import { RECORDS_EVENT } from '@/lib/mock-records';

const labels = {
  method: 'Payment gateway',
  subject: 'Deposit successful',
  body: (amount: string, id: string) => `${amount} credited (${id})`,
};

const paid: CreditableOrder = {
  orderId: 'PG-1',
  amountMinor: 50000,
  outcome: 'success',
  creditedAt: '2026-10-17T02:00:00.000Z',
};

function memoryWindow() {
  const data = new Map<string, string>();
  return {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
    dispatchEvent: vi.fn(),
  };
}

describe('deposit credit (T59A)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', memoryWindow());
  });

  it('only a success ruling stamped creditedAt is creditable', () => {
    expect(isCreditable(paid)).toBe(true);
    expect(isCreditable({ ...paid, outcome: 'failed' })).toBe(false);
    expect(isCreditable({ ...paid, outcome: 'processing' })).toBe(false);
    expect(isCreditable({ ...paid, creditedAt: undefined })).toBe(false);
    expect(isCreditable({ ...paid, amountMinor: 0 })).toBe(false);
    expect(isCreditable(null)).toBe(false);
  });

  it('credits once with the gateway idempotency key and writes the record', async () => {
    const credit = vi.fn().mockResolvedValue({});
    const record = await creditDeposit(paid, {
      at: '2026-10-17T02:00:01.000Z',
      currency: 'RM',
      labels,
      credit,
    });

    expect(credit).toHaveBeenCalledWith(50000, creditKey('PG-1'));
    expect(record?.row).toMatchObject({ kind: 'deposit', amountMinor: 50000, status: 'approved' });
    expect(record?.notice.body).toBe('RM 500.00 credited (PG-1)');
    expect(readDepositRecords()).toHaveLength(1);
  });

  it('a second attempt for the same order does not credit again', async () => {
    const credit = vi.fn().mockResolvedValue({});
    const options = { at: '2026-10-17T02:00:01.000Z', currency: 'RM', labels, credit };
    await creditDeposit(paid, options);
    const again = await creditDeposit(paid, options);

    expect(again).toBeNull();
    expect(credit).toHaveBeenCalledTimes(1);
    expect(readDepositRecords()).toHaveLength(1);
  });

  it('a failed or unstamped order never reaches the wallet', async () => {
    const credit = vi.fn().mockResolvedValue({});
    const options = { at: '2026-10-17T02:00:01.000Z', currency: 'RM', labels, credit };

    expect(await creditDeposit({ ...paid, outcome: 'failed' }, options)).toBeNull();
    expect(await creditDeposit({ ...paid, creditedAt: undefined }, options)).toBeNull();
    expect(credit).not.toHaveBeenCalled();
  });

  it('announces the new record so a mounted panel re-reads', async () => {
    const win = memoryWindow();
    vi.stubGlobal('window', win);
    await creditDeposit(paid, {
      at: '2026-10-17T02:00:01.000Z',
      currency: 'RM',
      labels,
      credit: vi.fn().mockResolvedValue({}),
    });

    expect(win.dispatchEvent).toHaveBeenCalledTimes(1);
    expect((win.dispatchEvent.mock.calls[0][0] as Event).type).toBe(RECORDS_EVENT);
  });
});
