// MOCK-ONLY: 会话 token 由本地 HMAC 签发（SESSION_SECRET），仅演示。接后台后改为后台下发并校验的会话/令牌。
/**
 * Signed session token: `base64url(payload).base64url(hmac-sha256(payload))`.
 *
 * Web Crypto only, so the same code runs in the Edge middleware and in Node
 * route handlers. The payload is readable by anyone holding the cookie; the
 * signature is what stops a visitor from forging a member session.
 */
export const SESSION_COOKIE = 'brand_session';

/** One day, matching the cookie's `max-age`. */
export const SESSION_MAX_AGE = 60 * 60 * 24;

export type SessionUser = {
  sub: string;
  username: string;
};

export type Session = SessionUser & {
  /** Unix time in seconds. */
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return 'ecl-mock-session-secret-dev-only';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) return null;
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function hmacKey(usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

export async function createSession(user: SessionUser, now = Date.now()): Promise<string> {
  const payload: Session = {
    ...user,
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey('sign'), encoder.encode(body) as BufferSource);
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Returns the session when the signature matches and the token has not expired,
 * otherwise `null`. `verify` compares the MAC in constant time.
 */
export async function readSession(token: string | undefined, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;

  const sigBytes = fromBase64Url(signature);
  const bodyBytes = fromBase64Url(body);
  if (!sigBytes || !bodyBytes) return null;

  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey('verify'),
    sigBytes as BufferSource,
    encoder.encode(body) as BufferSource,
  );
  if (!valid) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(decoder.decode(bodyBytes));
  } catch {
    return null;
  }
  if (!isSession(payload)) return null;
  if (payload.exp <= Math.floor(now / 1000)) return null;
  return payload;
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sub === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.exp === 'number'
  );
}
