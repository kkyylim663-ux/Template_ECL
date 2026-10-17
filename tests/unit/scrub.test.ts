import { describe, expect, it } from 'vitest';
import {
  FILTERED,
  isSensitiveKey,
  scrubEvent,
  scrubHeaders,
  scrubQueryString,
  scrubRequest,
  scrubUrl,
  scrubValue,
} from '@/lib/observability/scrub';

describe('isSensitiveKey', () => {
  it('matches credential-ish names, whatever the casing', () => {
    for (const key of [
      'token',
      'access_token',
      'accessToken',
      'password',
      'PWD',
      'secret',
      'apiKey',
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it('leaves ordinary names alone', () => {
    for (const key of ['page', 'gid', 'source', 'digest', 'method', 'amount']) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });
});

describe('scrubUrl', () => {
  it('drops sensitive query values and keeps the rest', () => {
    expect(scrubUrl('/my/account/deposit?token=abc123&amount=50')).toBe(
      '/my/account/deposit?amount=50',
    );
  });

  it('keeps the fragment, and leaves an untouched url byte-identical', () => {
    expect(scrubUrl('https://app.test/reset?key=k&next=%2Fmy#top')).toBe(
      'https://app.test/reset?next=%2Fmy#top',
    );
    expect(scrubUrl('/my/login?next=%2Fmy')).toBe('/my/login?next=%2Fmy');
    expect(scrubUrl('/my')).toBe('/my');
  });

  it('drops a query that is nothing but a secret', () => {
    expect(scrubUrl('/x?password=p')).toBe('/x');
  });
});

describe('scrubQueryString', () => {
  it('applies the same rule to the shape Sentry stores', () => {
    expect(scrubQueryString('a=1&secret=s&b=2')).toBe('a=1&b=2');
    expect(scrubQueryString('a=1&b=2')).toBe('a=1&b=2');
  });
});

describe('scrubHeaders', () => {
  it('removes credentials and keeps everything else', () => {
    expect(
      scrubHeaders({
        Cookie: 'brand_session=signed',
        authorization: 'Bearer t',
        'Content-Type': 'application/json',
      }),
    ).toEqual({ 'Content-Type': 'application/json' });
  });

  it('passes missing headers through', () => {
    expect(scrubHeaders(undefined)).toBeUndefined();
    expect(scrubHeaders({})).toEqual({});
  });
});

describe('scrubValue', () => {
  it('drops sensitive keys at any depth', () => {
    expect(scrubValue({ user: 'a', password: 'p', nested: { apiKey: 'k', keep: 1 } })).toEqual({
      user: 'a',
      nested: { keep: 1 },
    });
  });

  it('walks arrays and keeps primitives', () => {
    expect(scrubValue([{ token: 't' }, 'x', 2])).toEqual([{}, 'x', 2]);
    expect(scrubValue('plain')).toBe('plain');
  });

  it('stops at the depth cap instead of recursing forever', () => {
    expect(scrubValue({ a: { b: { c: { d: { e: { f: { g: 'deep' } } } } } } })).toEqual({
      a: { b: { c: { d: { e: { f: FILTERED } } } } },
    });
  });
});

describe('scrubRequest', () => {
  it('drops the cookie jar and scrubs url, query string, headers and body', () => {
    expect(
      scrubRequest({
        url: 'https://app.test/my/transfer?token=leak&from=main',
        query_string: 'token=leak&from=main',
        cookies: { brand_session: 'signed' },
        headers: { Cookie: 'brand_session=signed', Referer: 'https://app.test/my' },
        data: { amount: 50, password: 'p' },
        method: 'POST',
      }),
    ).toEqual({
      url: 'https://app.test/my/transfer?from=main',
      query_string: 'from=main',
      headers: { Referer: 'https://app.test/my' },
      data: { amount: 50 },
      method: 'POST',
    });
  });

  it('does not invent fields that were absent', () => {
    expect(scrubRequest({ url: '/my' })).toEqual({ url: '/my' });
  });
});

describe('scrubEvent', () => {
  it('scrubs the request and leaves the rest of the event alone', () => {
    expect(
      scrubEvent({
        message: 'boom',
        request: {
          url: '/x?pwd=1',
          cookies: { brand_session: 'signed' },
          headers: { Authorization: 'Bearer t' },
        },
      }),
    ).toEqual({ message: 'boom', request: { url: '/x', headers: {} } });
  });

  it('passes through anything that is not an event with a request', () => {
    expect(scrubEvent({ message: 'boom' })).toEqual({ message: 'boom' });
    expect(scrubEvent(null)).toBeNull();
    expect(scrubEvent(undefined)).toBeUndefined();
    expect(scrubEvent('a string')).toBe('a string');
  });
});
