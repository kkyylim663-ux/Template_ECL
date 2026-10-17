'use client';

import { ErrorFallback } from '@/components/ui/ErrorFallback';
import type { CaughtError } from '@/lib/report-error';

/**
 * Region boundary: catches a failing route-group layout (public / member / auth)
 * before any group boundary can. It renders where those layouts would have, so
 * there is no shell to keep — the group boundaries below it are the ones that
 * leave the chrome mounted.
 */
export default function RegionError({ error, reset }: { error: CaughtError; reset: () => void }) {
  return <ErrorFallback error={error} reset={reset} source="region" standalone />;
}
