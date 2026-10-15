import { describe, expect, it } from 'vitest';
import { createSession, readSession, SESSION_MAX_AGE } from '@/lib/session/token';
import { safeNext } from '@/lib/session/redirect';

const user = { sub: 'u_1001', username: 'demo_player' };
const NOW = 1_800_000_000_000;

describe('session token', () => {
  it('round-trips a freshly issued token', async () => {
    const token = await createSession(user, NOW);
    const session = await readSession(token, NOW);
    expect(session).toEqual({ ...user, exp: Math.floor(NOW / 1000) + SESSION_MAX_AGE });
  });

  it('rejects a token whose payload was altered', async () => {
    const token = await createSession(user, NOW);
    const [, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'u_9', username: 'admin', exp: 9_999_999_999 })).toString(
      'base64url',
    );
    expect(await readSession(`${forged}.${signature}`, NOW)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await createSession(user, NOW);
    expect(await readSession(token, NOW + (SESSION_MAX_AGE + 1) * 1000)).toBeNull();
  });

  it('rejects missing, malformed and extended tokens', async () => {
    const token = await createSession(user, NOW);
    expect(await readSession(undefined, NOW)).toBeNull();
    expect(await readSession('', NOW)).toBeNull();
    expect(await readSession('demo', NOW)).toBeNull();
    expect(await readSession(`${token}.extra`, NOW)).toBeNull();
    expect(await readSession('!!.!!', NOW)).toBeNull();
  });
});

describe('safeNext', () => {
  it('keeps same-origin paths with their query and hash', () => {
    expect(safeNext('/my/account/deposit?tab=1#top')).toBe('/my/account/deposit?tab=1#top');
  });

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', 'my/account'])(
    'falls back for %s',
    (next) => {
      expect(safeNext(next, '/my')).toBe('/my');
    },
  );

  it('falls back when nothing is given', () => {
    expect(safeNext(null, '/my')).toBe('/my');
    expect(safeNext(undefined)).toBe('/');
  });
});
