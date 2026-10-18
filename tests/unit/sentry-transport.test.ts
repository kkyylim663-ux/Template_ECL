import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DSN_KEY,
  captureException,
  initObservability,
  readDsn,
  readRate,
  sentryOptions,
} from '@/lib/observability/setup';

/**
 * T75: the switch, and what actually reaches the wire. The SDK is only ever
 * loaded behind a DSN, so the first half pins the gate with an injected loader;
 * the last tests run the real SDK with a recording transport in place of the
 * network, which is the only place an envelope can be counted.
 */

const DSN = 'https://public@example.invalid/1';

/** A transport that records the events the SDK would have posted, and posts nothing. */
function recordingTransport() {
  const events: Array<Record<string, unknown>> = [];
  const transport = {
    // `unknown` in, SDK types out: the SDK's Envelope is a union this test has
    // no business re-declaring, and the shape below is what it actually sends.
    send: (envelope: unknown) => {
      const items = (envelope as Array<unknown>)[1] as Array<
        [{ type: string }, Record<string, unknown>]
      >;
      for (const [header, payload] of items) {
        if (header.type === 'event') events.push(payload);
      }
      return Promise.resolve({
        statusCode: 200,
        // @sentry/core's TransportMakeRequestResponse wants the two rate-limit
        // headers spelled out, not just an open index signature.
        headers: { 'x-sentry-rate-limits': null, 'retry-after': null },
      });
    },
    flush: () => Promise.resolve(true),
  };
  return { events, make: () => transport };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the DSN switch', () => {
  it('treats unset and blank as off, and trims a real one', () => {
    expect(readDsn({})).toBeUndefined();
    expect(readDsn({ [DSN_KEY]: '   ' })).toBeUndefined();
    expect(readDsn({ [DSN_KEY]: ` ${DSN} ` })).toBe(DSN);
  });

  it('reads rates with a fallback, and clamps what is out of range', () => {
    expect(readRate({}, 'X', 1)).toBe(1);
    expect(readRate({ X: '' }, 'X', 1)).toBe(1);
    expect(readRate({ X: 'nope' }, 'X', 0.5)).toBe(0.5);
    expect(readRate({ X: '0.25' }, 'X', 1)).toBe(0.25);
    expect(readRate({ X: '2' }, 'X', 1)).toBe(1);
    expect(readRate({ X: '-1' }, 'X', 1)).toBe(0);
  });
});

describe('initObservability', () => {
  it('never touches the loader without a DSN — the library is not even reached', async () => {
    const load = vi.fn();
    await expect(initObservability({ env: {}, loader: load })).resolves.toBe(false);
    await expect(initObservability({ env: { [DSN_KEY]: '  ' }, loader: load })).resolves.toBe(
      false,
    );
    expect(load).not.toHaveBeenCalled();
  });

  it('inits once with the DSN, the rates and the scrubbing beforeSend', async () => {
    const init = vi.fn();
    const ready = await initObservability({
      env: { [DSN_KEY]: DSN, NEXT_PUBLIC_SENTRY_SAMPLE_RATE: '0.5' },
      loader: async () => ({ init }),
    });

    expect(ready).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);

    const [options] = init.mock.calls[0] as [
      Record<string, unknown> & { beforeSend: (event: unknown) => unknown },
    ];
    expect(options).toMatchObject({ dsn: DSN, sampleRate: 0.5, tracesSampleRate: 0 });

    // The last gate: what beforeSend hands the transport carries no session.
    const scrubbed = options.beforeSend({
      request: {
        url: '/my?token=t',
        cookies: { brand_session: 'signed' },
        headers: { Cookie: 'brand_session=signed' },
      },
    }) as { request: Record<string, unknown> };
    expect(scrubbed.request).toEqual({ url: '/my', headers: {} });
  });

  it('survives a loader that cannot load', async () => {
    await expect(
      initObservability({
        env: { [DSN_KEY]: DSN },
        loader: async () => {
          throw new Error('chunk never arrived');
        },
      }),
    ).resolves.toBe(false);
  });
});

describe('captureException against a real SDK with a recording transport', () => {
  it('one thrown error, with a DSN, becomes exactly one posted event', async () => {
    const { events, make } = recordingTransport();
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({ ...sentryOptions(DSN, {}), transport: make });

    vi.stubEnv(DSN_KEY, DSN);
    expect(captureException(new Error('boom'), { source: 'public', page: undefined })).toBe(true);
    await Sentry.flush(2000);

    expect(events).toHaveLength(1);
    const event = events[0] as {
      exception?: { values?: Array<{ value?: string }> };
      extra?: Record<string, unknown>;
    };
    expect(event.exception?.values?.[0]?.value).toBe('boom');
    // The undefined value was dropped on the way in, like the console line does.
    expect(event.extra).toEqual({ source: 'public' });
  });

  it('the same call without a DSN posts nothing, even with a client alive', async () => {
    const { events, make } = recordingTransport();
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({ ...sentryOptions(DSN, {}), transport: make });

    vi.stubEnv(DSN_KEY, '');
    expect(captureException(new Error('ignored'), { source: 'public' })).toBe(false);
    await Sentry.flush(2000);

    expect(events).toEqual([]);
  });
});
