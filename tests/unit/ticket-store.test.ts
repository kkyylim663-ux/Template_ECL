import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTicketStore, type TicketCode } from '@/lib/mock-tickets/store';

/**
 * T65's contract: the ticket store's server rules — a code must be in the
 * catalogue, may only be redeemed once and must not be past its own expiry; a
 * ticket may only be spent once and must be one the server still calls
 * available; one idempotency key writes one row. The e2e covers the page.
 */
const at = new Date('2026-10-17T14:00:00+08:00');
const catalogue: TicketCode[] = [
  { code: 'TICKET2026', tickets: 1, expiresAt: '2026-12-31T23:59:00+08:00' },
  { code: 'FIVETICKETS', tickets: 5, expiresAt: '2026-11-30T23:59:00+08:00' },
  { code: 'EXPIREDCODE', tickets: 1, expiresAt: '2026-09-30T23:59:00+08:00' },
];
const ctx = { catalogue, now: at };

const empty = { redemptions: [], spends: [] };
const memory = () => createTicketStore({ file: null, storeSeed: empty });

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ticket-store-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('redeem', () => {
  it('hands out the tickets the code carries, on the code’s own expiry', async () => {
    const store = memory();
    const result = await store.redeem({ code: 'FIVETICKETS', idempotencyKey: 'key-1' }, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replayed).toBe(false);
    expect(result.entry).toMatchObject({
      code: 'FIVETICKETS',
      tickets: 5,
      expiresAt: '2026-11-30T23:59:00+08:00',
      redeemedAt: '2026-10-17T06:00:00.000Z',
      idempotencyKey: 'key-1',
    });
    expect(result.entry.id).toMatch(/^tr_/);
  });

  it('matches the code case-insensitively and stores the upper case', async () => {
    const store = memory();
    const result = await store.redeem({ code: '  ticket2026 ', idempotencyKey: 'key-1' }, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.code).toBe('TICKET2026');
  });

  it('rejects a code the catalogue does not know', async () => {
    const store = memory();
    expect(await store.redeem({ code: 'NOPE', idempotencyKey: 'key-1' }, ctx)).toEqual({ ok: false, code: '404' });
  });

  it('rejects a code past its own expiry', async () => {
    const store = memory();
    expect(await store.redeem({ code: 'EXPIREDCODE', idempotencyKey: 'key-1' }, ctx)).toEqual({
      ok: false,
      code: '410',
    });
  });

  it('rejects a second redemption of the same code', async () => {
    const store = memory();
    await store.redeem({ code: 'TICKET2026', idempotencyKey: 'key-1' }, ctx);
    expect(await store.redeem({ code: 'ticket2026', idempotencyKey: 'key-2' }, ctx)).toEqual({
      ok: false,
      code: '409',
    });
  });

  it('replays one idempotency key as the same redemption', async () => {
    const store = memory();
    const first = await store.redeem({ code: 'TICKET2026', idempotencyKey: 'key-1' }, ctx);
    const again = await store.redeem({ code: 'TICKET2026', idempotencyKey: 'key-1' }, ctx);

    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.replayed).toBe(true);
    expect(again.entry.id).toBe(first.entry.id);
    expect((await store.read()).redemptions).toHaveLength(1);
  });
});

describe('spend', () => {
  const spendCtx = { availableIds: ['tk-1-1', 'tk-1-2'], now: at };
  const draft = { ticketId: 'tk-1-1', eventId: 'prediction', eventName: 'prediction', idempotencyKey: 'key-1' };

  it('records the spend against the ticket', async () => {
    const store = memory();
    const result = await store.spend(draft, spendCtx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry).toMatchObject({
      ticketId: 'tk-1-1',
      eventId: 'prediction',
      spentAt: '2026-10-17T06:00:00.000Z',
    });
    expect((await store.read()).spends).toHaveLength(1);
  });

  it('rejects a ticket that is not available any more', async () => {
    const store = memory();
    expect(await store.spend({ ...draft, ticketId: 'tk-9-9' }, spendCtx)).toEqual({ ok: false, code: '404' });
  });

  it('rejects spending the same ticket twice', async () => {
    const store = memory();
    await store.spend(draft, spendCtx);
    expect(await store.spend({ ...draft, idempotencyKey: 'key-2' }, spendCtx)).toEqual({ ok: false, code: '409' });
  });

  it('replays a retried spend even after the ticket left the available set', async () => {
    const store = memory();
    const first = await store.spend(draft, spendCtx);
    const again = await store.spend(draft, { availableIds: [], now: at });

    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.replayed).toBe(true);
    expect(again.entry.id).toBe(first.entry.id);
    expect((await store.read()).spends).toHaveLength(1);
  });
});

describe('the file behind the store', () => {
  it('seeds from the given seed when the file does not exist yet', async () => {
    const store = createTicketStore({ file: join(dir, 'ticket-store.json'), storeSeed: empty });
    expect(await store.read()).toEqual(empty);
  });

  it('keeps a redemption across store instances', async () => {
    const file = join(dir, 'ticket-store.json');
    await createTicketStore({ file, storeSeed: empty }).redeem({ code: 'TICKET2026', idempotencyKey: 'key-1' }, ctx);

    const reopened = createTicketStore({ file, storeSeed: empty });
    const snapshot = await reopened.read();
    expect(snapshot.redemptions).toHaveLength(1);
    expect(snapshot.redemptions[0].code).toBe('TICKET2026');

    // A second instance must not hand the same code out again.
    expect(await reopened.redeem({ code: 'TICKET2026', idempotencyKey: 'key-2' }, ctx)).toEqual({
      ok: false,
      code: '409',
    });
    const raw = JSON.parse(await readFile(file, 'utf8')) as { redemptions: unknown[] };
    expect(raw.redemptions).toHaveLength(1);
  });

  it('reports a corrupt file instead of silently reseeding', async () => {
    const file = join(dir, 'ticket-store.json');
    await writeFile(file, 'not json', 'utf8');
    await expect(createTicketStore({ file, storeSeed: empty }).read()).rejects.toThrow();
  });
});
