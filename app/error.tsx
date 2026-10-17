'use client';

import { ErrorFallback } from '@/components/ui/ErrorFallback';
import type { CaughtError } from '@/lib/report-error';

/**
 * Root boundary: everything under the root layout that has no closer one — the
 * `/dev/*` tooling today. A failure of the root layout itself is global-error's
 * job, and the region tree has its own boundary beneath this one.
 */
export default function AppError({ error, reset }: { error: CaughtError; reset: () => void }) {
  return <ErrorFallback error={error} reset={reset} source="app" standalone />;
}
