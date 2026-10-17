'use client';

import { ErrorFallback } from '@/components/ui/ErrorFallback';
import type { CaughtError } from '@/lib/report-error';

/**
 * Boundary for the sign-in pages. `(auth)/layout.tsx` already provides the
 * `main` landmark, so the fallback renders as a plain block inside it.
 */
export default function AuthError({ error, reset }: { error: CaughtError; reset: () => void }) {
  return <ErrorFallback error={error} reset={reset} source="auth" />;
}
