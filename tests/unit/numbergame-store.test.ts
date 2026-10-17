import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createNumberGameStore } from '@/lib/mock-numbergame/store';

const now = new Date('2026-10-17T08:00:00.000Z');
const slip = {
  lines: [
    [3, 11, 19, 26, 34, 42],
    [7, 8, 9, 10, 11, 12],
  ],
  amountMinor: 100,
  idempotencyKey: 'k-1',
};

describe('number game store', () => {
  it('accepts a complete slip and prices the lines', async () => {
    const store = createNumberGameStore({ file: null });
    const result = await store.place(slip, { now });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.id).toMatch(/^ng_/);
    expect(result.entry.totalMinor).toBe(200);
    expect(result.entry.placedAt).toBe(now.toISOString());
    expect(result.replayed).toBe(false);
    expect((await store.read()).bets).toHaveLength(1);
  });

  it('replays one idempotency key instead of booking the slip twice', async () => {
    const store = createNumberGameStore({ file: null });
    const first = await store.place(slip, { now });
    const second = await store.place(slip, { now });

    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.entry.id).toBe(first.entry.id);
    expect((await store.read()).bets).toHaveLength(1);
  });

  it('refuses an incomplete line, too many lines and a stake outside the window', async () => {
    const store = createNumberGameStore({ file: null });

    expect(
      await store.place({ ...slip, lines: [[1, 2, 3]], idempotencyKey: 'a' }, { now }),
    ).toEqual({ ok: false, code: '212' });
    expect(
      await store.place(
        {
          lines: [slip.lines[0], slip.lines[1], [13, 14, 15, 16, 17, 18]],
          amountMinor: 100,
          idempotencyKey: 'b',
        },
        { now },
      ),
    ).toEqual({ ok: false, code: '213' });
    expect(
      await store.place(
        { lines: [slip.lines[0]], amountMinor: 99, idempotencyKey: 'c' },
        { now },
      ),
    ).toEqual({ ok: false, code: '210' });
    expect(
      await store.place(
        { lines: [slip.lines[0]], amountMinor: 100_001, idempotencyKey: 'd' },
        { now },
      ),
    ).toEqual({ ok: false, code: '211' });
    expect((await store.read()).bets).toHaveLength(0);
  });

  it('keys one line by its sorted numbers', async () => {
    const store = createNumberGameStore({ file: null });
    const result = await store.place(
      { lines: [[42, 3, 19, 11, 34, 26]], amountMinor: 500, idempotencyKey: 'e' },
      { now },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.lines[0]).toEqual([3, 11, 19, 26, 34, 42]);
    expect(result.entry.totalMinor).toBe(500);
  });

  it('falls back to the seed when the runtime file is missing, and re-reads it when it is not', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ng-store-'));
    const file = join(dir, 'numbergame-bets.json');
    try {
      const cold = createNumberGameStore({ file });
      expect((await cold.read()).bets).toHaveLength(0); // mocks/numbergame-bets.json is empty

      await writeFile(
        file,
        JSON.stringify({ bets: [{ ...slip, id: 'ng_seeded', totalMinor: 200, placedAt: now.toISOString() }] }),
        'utf8',
      );
      const second = createNumberGameStore({ file });
      expect((await second.read()).bets).toHaveLength(1);

      await second.place({ lines: [slip.lines[0]], amountMinor: 250, idempotencyKey: 'f' }, { now });
      const third = createNumberGameStore({ file });
      const snapshot = await third.read();
      expect(snapshot.bets).toHaveLength(2);
      expect(snapshot.bets[0].amountMinor).toBe(250);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
