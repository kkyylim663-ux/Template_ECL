'use client';

import { ErrorFallback } from '@/components/ui/ErrorFallback';
import type { CaughtError } from '@/lib/report-error';

/**
 * Boundary for the member area. Like the public one it stays inside the
 * AppShell, so the account rail and the header survive a failing page.
 */
export default function MemberError({ error, reset }: { error: CaughtError; reset: () => void }) {
  return <ErrorFallback error={error} reset={reset} source="member" />;
}
