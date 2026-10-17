'use client';

import { ErrorFallback } from '@/components/ui/ErrorFallback';
import type { CaughtError } from '@/lib/report-error';

/**
 * Boundary for the public shop window. It renders *inside* the AppShell, so a
 * failing page replaces only the page area: header, side rail and footer stay
 * mounted and usable, and Retry re-renders just this segment.
 */
export default function PublicError({ error, reset }: { error: CaughtError; reset: () => void }) {
  return <ErrorFallback error={error} reset={reset} source="public" />;
}
