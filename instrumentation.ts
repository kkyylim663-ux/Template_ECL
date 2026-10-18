/**
 * T75: server-side error reporting. Next calls `register` once per server
 * runtime; everything real lives in `lib/observability/setup.ts`, which returns
 * before importing the SDK when no DSN is configured.
 */
import { initObservability } from '@/lib/observability/setup';

export async function register(): Promise<void> {
  // Middleware runs on the edge runtime, which has no Node APIs and reports
  // nothing in this app.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  await initObservability();
}
