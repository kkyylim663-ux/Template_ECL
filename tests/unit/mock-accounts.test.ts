import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAccountStore, type Account, type NewAccount } from '@/lib/mock-auth/accounts';

const fixtures: Account[] = [
  {
    id: 'u_1001',
    username: 'demo_player',
    email: 'demo@example.test',
    phone: '+60123456789',
    otp: '123456',
    walletOpening: 'seed',
    password: 'Test1234!',
  },
];

const draft: NewAccount = {
  username: 'newplayer1',
  email: 'new@example.test',
  phone: '+60111222333',
  password: 'Secret123',
  fullName: 'Ada Lim',
  nickname: 'ada',
  otp: '123456',
};

describe('mock account store', () => {
  it('finds preset accounts by username, email or phone digits', async () => {
    const store = createAccountStore({ file: null, fixtures });
    expect((await store.findByIdentifier('DEMO_PLAYER'))?.id).toBe('u_1001');
    expect((await store.findByIdentifier('demo@example.test'))?.id).toBe('u_1001');
    expect((await store.findByIdentifier('+60 123-456-789'))?.id).toBe('u_1001');
    expect(await store.findByIdentifier('nobody')).toBeUndefined();
  });

  it('verifies preset passwords in plain text and rejects a wrong one', async () => {
    const store = createAccountStore({ file: null, fixtures });
    const user = (await store.findByIdentifier('demo_player'))!;
    expect(await store.verifyPassword(user, 'Test1234!')).toBe(true);
    expect(await store.verifyPassword(user, 'Test1234?')).toBe(false);
  });

  it('creates an account that signs in by username, email and phone', async () => {
    const store = createAccountStore({ file: null, fixtures });
    const result = await store.create(draft);
    expect(result.ok).toBe(true);
    for (const id of ['newplayer1', 'new@example.test', '+60111222333']) {
      expect((await store.findByIdentifier(id))?.username).toBe('newplayer1');
    }
    const user = (await store.findByIdentifier('newplayer1'))!;
    expect(await store.verifyPassword(user, 'Secret123')).toBe(true);
    expect(await store.verifyPassword(user, 'secret123')).toBe(false);
  });

  it('gives registered accounts zero wallets and keeps presets on the seed', async () => {
    const store = createAccountStore({ file: null, fixtures });
    const result = await store.create(draft);
    expect(result.ok && result.account.walletOpening).toBe('zero');
    expect((await store.getById('u_1001'))?.walletOpening).toBe('seed');
  });

  it('reports a duplicate username, email or mobile and names the field', async () => {
    const store = createAccountStore({ file: null, fixtures });
    await store.create(draft);
    expect(await store.create({ ...draft, username: 'NEWPLAYER1', email: 'x@x.test', phone: '+60199999999' }))
      .toEqual({ ok: false, field: 'username' });
    expect(await store.create({ ...draft, username: 'other1', email: 'NEW@example.test', phone: '+60199999999' }))
      .toEqual({ ok: false, field: 'email' });
    expect(await store.create({ ...draft, username: 'other2', email: 'o@x.test', phone: '+60 111 222 333' }))
      .toEqual({ ok: false, field: 'mobile' });
  });

  it('treats preset usernames and phones as taken', async () => {
    const store = createAccountStore({ file: null, fixtures });
    expect(await store.takenField({ username: 'Demo_Player' })).toBe('username');
    expect(await store.takenField({ phone: '60123456789' })).toBe('mobile');
    expect(await store.takenField({ username: 'fresh1' })).toBeNull();
  });

  it('changes a preset password in memory and a registered password in the store', async () => {
    const store = createAccountStore({ file: null, fixtures });
    await store.setPassword('u_1001', 'Changed99');
    const preset = (await store.findByIdentifier('demo_player'))!;
    expect(await store.verifyPassword(preset, 'Changed99')).toBe(true);
    expect(await store.verifyPassword(preset, 'Test1234!')).toBe(false);

    const created = (await store.create(draft));
    if (!created.ok) throw new Error('setup failed');
    await store.setPassword(created.account.id, 'Newpass12');
    const user = (await store.findByIdentifier('newplayer1'))!;
    expect(await store.verifyPassword(user, 'Newpass12')).toBe(true);
    expect(await store.verifyPassword(user, 'Secret123')).toBe(false);
  });

  describe('file persistence', () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'mock-accounts-'));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('keeps registered accounts across store instances and never writes the plain password', async () => {
      const file = join(dir, 'users.json');
      const first = createAccountStore({ file, fixtures });
      expect((await first.create(draft)).ok).toBe(true);

      const second = createAccountStore({ file, fixtures });
      const user = (await second.findByIdentifier('newplayer1'))!;
      expect(await second.verifyPassword(user, 'Secret123')).toBe(true);

      const raw = await readFile(file, 'utf8');
      expect(raw).not.toContain('Secret123');
      expect(raw).toContain('scrypt$');
    });

    it('starts empty when the file does not exist yet', async () => {
      const store = createAccountStore({ file: join(dir, 'missing', 'users.json'), fixtures });
      expect(await store.findByIdentifier('newplayer1')).toBeUndefined();
      expect((await store.create(draft)).ok).toBe(true);
    });
  });
});
