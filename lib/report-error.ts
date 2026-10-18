import { isRegionCode } from '@/config/brand';
import { captureException } from '@/lib/observability/setup';

/**
 * The reporting seam every boundary funnels through. The body writes one
 * structured console line — visible in devtools with no backend — and, when
 * `NEXT_PUBLIC_SENTRY_DSN` is set (T75), forwards the same error to Sentry
 * behind this same signature.
 */
export type ErrorSource = 'app' | 'region' | 'public' | 'member' | 'auth' | 'global';

/** Extra facts attached to a report. `undefined` values are dropped, not printed. */
export type ErrorContext = Record<string, string | number | boolean | undefined>;

/** The shape Next hands an `error.tsx`: any thrown value, digest added in prod. */
export type CaughtError = Error & { digest?: string };

/** One line for a log: name, message, and the digest production adds. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const name = error.name || 'Error';
    const message = error.message || '(no message)';
    const digest = (error as { digest?: string }).digest;
    return digest ? `${name}: ${message} [digest ${digest}]` : `${name}: ${message}`;
  }
  if (typeof error === 'string') return `Error: ${error}`;
  // Anything at all can be thrown; the reporter still has to say what it saw.
  return `Error: (thrown value is ${error === null ? 'null' : typeof error})`;
}

/** Writes the report. Never throws — a failing reporter hides the failure it reports. */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  const facts = Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  console.error(`[report-error] ${describeError(error)}${facts ? ` (${facts})` : ''}`);
  // Off unless a DSN is configured: without one this returns before the SDK is
  // imported, so a no-DSN build makes no request at all.
  captureException(error, context);
}

/**
 * Where a fallback's "Back to home" link points: the market the failing path is
 * already in, otherwise the bare root, which middleware redirects to the
 * default market.
 */
export function homeHref(pathname: string | null | undefined): string {
  const first = (pathname ?? '').split('/').filter(Boolean)[0];
  return first && isRegionCode(first) ? `/${first}` : '/';
}
