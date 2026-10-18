/**
 * T75: the only module that knows Sentry exists. Both instrumentation entries
 * call in here, and the SDK is reached through a dynamic import *after* the DSN
 * check — so a build with no `NEXT_PUBLIC_SENTRY_DSN` never evaluates the
 * library, and makes no request to it. That is the off switch.
 */
import { scrubEvent } from './scrub';

/**
 * Type-only import: erased at compile time, so referencing the SDK's types here
 * never pulls the library into a bundle. The value import happens in
 * `loadSentry` below and nowhere else.
 */
type SentryNamespace = typeof import('@sentry/nextjs');

export type Env = Record<string, string | undefined>;

export const DSN_KEY = 'NEXT_PUBLIC_SENTRY_DSN';
export const SAMPLE_RATE_KEY = 'NEXT_PUBLIC_SENTRY_SAMPLE_RATE';
export const TRACES_RATE_KEY = 'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE';

export type SentryInitOptions = Parameters<SentryNamespace['init']>[0];

/** The DSN, trimmed. Unset and whitespace-only both mean off. */
export function readDsn(env: Env = process.env): string | undefined {
  const dsn = env[DSN_KEY]?.trim();
  return dsn || undefined;
}

/** A 0..1 rate: unparseable values fall back, out-of-range ones clamp. */
export function readRate(env: Env, key: string, fallback: number): number {
  const raw = env[key]?.trim();
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

/** Errors in full, traces off: a mock-era site has no use for spans. */
export function sentryOptions(dsn: string, env: Env = process.env): SentryInitOptions {
  return {
    dsn,
    sampleRate: readRate(env, SAMPLE_RATE_KEY, 1),
    tracesSampleRate: readRate(env, TRACES_RATE_KEY, 0),
    beforeSend: scrubEvent,
  };
}

let sentry: Promise<SentryNamespace> | null = null;

/** The one place the SDK is imported; memoized so it is evaluated at most once. */
export function loadSentry(): Promise<SentryNamespace> {
  sentry ??= import('@sentry/nextjs');
  return sentry;
}

/** What `initObservability` needs of the SDK — tests inject a fake through it. */
export type Loader = () => Promise<Pick<SentryNamespace, 'init'>>;

/**
 * Initializes reporting, or says it is off. Never throws: a reporter that fails
 * must not take the app down with it.
 */
export async function initObservability(
  options: { env?: Env; loader?: Loader } = {},
): Promise<boolean> {
  const env = options.env ?? process.env;
  const dsn = readDsn(env);
  if (!dsn) return false;

  try {
    const Sentry = await (options.loader ? options.loader() : loadSentry());
    Sentry.init(sentryOptions(dsn, env));
    return true;
  } catch {
    return false;
  }
}

/**
 * Forwards one error to Sentry when a DSN is configured. `false` means the
 * console line `reportError` already wrote is the whole report.
 */
export function captureException(error: unknown, context: Record<string, unknown> = {}): boolean {
  if (!readDsn()) return false;

  const extra = Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
  void loadSentry()
    .then((Sentry) => Sentry.captureException(error, { extra }))
    .catch(() => {
      // The console line is already out; a failed forward must not become a
      // second failure. Swallowing is the whole point of a reporter.
    });
  return true;
}
