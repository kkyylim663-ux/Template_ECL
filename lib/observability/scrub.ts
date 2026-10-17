/**
 * T75: the values an error report must not carry off the device — the member
 * session, credentials, and anything named like a secret. Pure functions with no
 * Sentry import: the unit test pins the rules, and `setup.ts` wires `scrubEvent`
 * into the SDK's `beforeSend`, which is the last gate before a request leaves.
 */

/**
 * A key that carries a credential, whatever else it is called. Substring match,
 * so a false positive drops one field and a false negative leaks a session.
 */
const SENSITIVE_KEY = /token|pass|pwd|secret|key/i;

/** Header names that never leave the process: the member session rides in Cookie. */
const SENSITIVE_HEADER = /^(authorization|proxy-authorization|cookie|set-cookie)$/i;

/** Deep enough for Sentry's own event shapes, shallow enough to stay cheap. */
const MAX_DEPTH = 6;

/** What replaces a value that cannot be inspected safely. */
export const FILTERED = '[Filtered]';

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

/** Keeps the URL and drops the value of every `?token=`-style parameter. */
export function scrubUrl(url: string): string {
  const hashAt = url.indexOf('#');
  const hash = hashAt === -1 ? '' : url.slice(hashAt);
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  if (queryAt === -1) return url;

  const scrubbed = scrubQueryString(beforeHash.slice(queryAt + 1));
  return `${beforeHash.slice(0, queryAt)}${scrubbed ? `?${scrubbed}` : ''}${hash}`;
}

/** The same rule for a bare query string (`a=1&token=x`), the shape Sentry stores. */
export function scrubQueryString(query: string): string {
  const params = new URLSearchParams(query);
  let dropped = false;
  for (const key of [...params.keys()]) {
    if (isSensitiveKey(key)) {
      params.delete(key);
      dropped = true;
    }
  }
  return dropped ? params.toString() : query;
}

/** Sensitive headers are removed, not blanked — a blanked one still says it was there. */
export function scrubHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (!SENSITIVE_HEADER.test(name)) out[name] = value;
  }
  return out;
}

/** Recursively drops entries whose key looks like a credential: bodies and extra facts. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    return depth >= MAX_DEPTH ? FILTERED : value.map((item) => scrubValue(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    if (depth >= MAX_DEPTH) return FILTERED;
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (!isSensitiveKey(key)) out[key] = scrubValue(entry, depth + 1);
    }
    return out;
  }
  return value;
}

/** The request Sentry would attach: no cookies, no credentials, no secret query keys. */
export function scrubRequest(request: Record<string, unknown>): Record<string, unknown> {
  const out = { ...request };
  // The whole cookie jar goes, not just the session: nothing here is worth sending.
  delete out.cookies;
  if (typeof out.url === 'string') out.url = scrubUrl(out.url);
  if (typeof out.query_string === 'string') out.query_string = scrubQueryString(out.query_string);
  if (out.headers && typeof out.headers === 'object') {
    out.headers = scrubHeaders(out.headers as Record<string, string>);
  }
  if ('data' in out) out.data = scrubValue(out.data);
  return out;
}

/**
 * `beforeSend`. Generic in and out so it drops into either runtime's options
 * unchanged; an event without a request comes back untouched.
 */
export function scrubEvent<T>(event: T): T {
  const candidate = event as { request?: Record<string, unknown> } | null | undefined;
  if (!candidate || typeof candidate !== 'object' || !candidate.request) return event;
  return { ...candidate, request: scrubRequest(candidate.request) } as T;
}
