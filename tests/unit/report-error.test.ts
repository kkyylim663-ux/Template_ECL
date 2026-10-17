import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeError, homeHref, reportError } from '@/lib/report-error';

describe('describeError', () => {
  it('carries the name, the message and the digest', () => {
    expect(describeError(new Error('boom'))).toBe('Error: boom');
    expect(describeError(Object.assign(new TypeError('bad'), { digest: 'abc123' }))).toBe(
      'TypeError: bad [digest abc123]',
    );
  });

  it('fills the message slot rather than printing an empty one', () => {
    expect(describeError(new Error(''))).toBe('Error: (no message)');
    expect(describeError({ name: '' })).toBe('Error: (thrown value is object)');
  });

  it('describes values that are not errors', () => {
    expect(describeError('plain text')).toBe('Error: plain text');
    expect(describeError(null)).toBe('Error: (thrown value is null)');
    expect(describeError(undefined)).toBe('Error: (thrown value is undefined)');
    expect(describeError(42)).toBe('Error: (thrown value is number)');
  });
});

describe('reportError', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes one console line with the digest and the context', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportError(Object.assign(new Error('ssr failed'), { digest: 'd1' }), { source: 'public' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('[report-error] Error: ssr failed [digest d1] (source=public)');
  });

  it('drops undefined context values and never throws on foreign input', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      reportError(undefined, { source: undefined, page: '/my/offline' }),
    ).not.toThrow();

    expect(spy.mock.calls[0][0]).toBe(
      '[report-error] Error: (thrown value is undefined) (page=/my/offline)',
    );
  });
});

describe('homeHref', () => {
  it('keeps the market the failing path is already in', () => {
    expect(homeHref('/sg/account/deposit')).toBe('/sg');
    expect(homeHref('/my')).toBe('/my');
  });

  it('falls back to the root redirect for dev paths and for nothing', () => {
    expect(homeHref('/dev/error-test')).toBe('/');
    expect(homeHref('/')).toBe('/');
    expect(homeHref('')).toBe('/');
    expect(homeHref(null)).toBe('/');
    expect(homeHref(undefined)).toBe('/');
  });
});
