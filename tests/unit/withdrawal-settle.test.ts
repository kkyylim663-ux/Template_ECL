import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isSettleable,
  readWithdrawalRecords,
  refundKey,
  settleWithdrawal,
  type SettleableRequest,
} from '@/lib/withdrawal-settle';
import { RECORDS_EVENT } from '@/lib/mock-records';

const labels = {
  method: 'Bank transfer',
  subject: 'Withdrawal update',
  body: (amount: string, reference: string) => `${amount} ${reference}`,
};

const base: SettleableRequest = {
  id: 'wd_a1',
  reference: 'WD-ABC',
  amountMinor: 20000,
  methodLabel: 'Bank transfer',
  status: 'failed',
  createdAt: '2026-10-17T02:00:00.000Z',
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

describe('withdrawal settle (T59B)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', memoryWindow());
  });

  it('only a final status is settleable', () => {
    expect(isSettleable(base)).toBe(true);
    expect(isSettleable({ ...base, status: 'success' })).toBe(true);
    expect(isSettleable({ ...base, status: 'pending' })).toBe(false);
    expect(isSettleable({ ...base, amountMinor: 0 })).toBe(false);
    expect(isSettleable(null)).toBe(false);
  });

  it('a failed withdrawal refunds the same amount once, keyed by the request', async () => {
    const refund = vi.fn().mockResolvedValue({});
    const record = await settleWithdrawal(base, {
      at: '2026-10-17T03:00:00.000Z',
      currency: 'RM',
      labels,
      refund,
    });

    expect(refund).toHaveBeenCalledWith(20000, refundKey('wd_a1'));
    expect(record?.row).toMatchObject({ kind: 'withdrawal', status: 'rejected', amountMinor: 20000 });
    expect(record?.notice.body).toBe('RM 200.00 WD-ABC');
    expect(readWithdrawalRecords()).toHaveLength(1);
  });

  it('a successful withdrawal leaves the balance alone and records approval', async () => {
    const refund = vi.fn().mockResolvedValue({});
    const record = await settleWithdrawal(
      { ...base, status: 'success' },
      { at: '2026-10-17T03:00:00.000Z', currency: 'RM', labels, refund },
    );

    expect(refund).not.toHaveBeenCalled();
    expect(record?.row).toMatchObject({ kind: 'withdrawal', status: 'approved' });
  });

  it('settling the same request again does not refund twice', async () => {
    const refund = vi.fn().mockResolvedValue({});
    const options = { at: '2026-10-17T03:00:00.000Z', currency: 'RM', labels, refund };
    await settleWithdrawal(base, options);
    const again = await settleWithdrawal(base, options);

    expect(again).toBeNull();
    expect(refund).toHaveBeenCalledTimes(1);
    expect(readWithdrawalRecords()).toHaveLength(1);
  });

  it('a pending request never settles', async () => {
    const refund = vi.fn().mockResolvedValue({});
    const result = await settleWithdrawal(
      { ...base, status: 'pending' },
      { at: '2026-10-17T03:00:00.000Z', currency: 'RM', labels, refund },
    );

    expect(result).toBeNull();
    expect(refund).not.toHaveBeenCalled();
  });

  it('announces the settled record so a mounted panel re-reads', async () => {
    const win = memoryWindow();
    vi.stubGlobal('window', win);
    await settleWithdrawal(base, {
      at: '2026-10-17T03:00:00.000Z',
      currency: 'RM',
      labels,
      refund: vi.fn().mockResolvedValue({}),
    });

    expect(win.dispatchEvent).toHaveBeenCalledTimes(1);
    expect((win.dispatchEvent.mock.calls[0][0] as Event).type).toBe(RECORDS_EVENT);
  });
});
