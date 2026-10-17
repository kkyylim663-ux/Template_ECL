'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { homeHref, reportError, type CaughtError, type ErrorSource } from '@/lib/report-error';

/**
 * The one fallback every `error.tsx` renders (T74). `reset()` is the segment
 * re-render Next hands a boundary, so Retry recovers in place and everything
 * above the failing segment — in the shelled groups, the header, the rail and
 * the footer — keeps working.
 *
 * `standalone` marks the boundaries that render with no AppShell `main` around
 * them (root, region, global); inside the public and member groups the shell
 * already provides the landmark, so the fallback stays a plain block.
 *
 * The heading takes focus on mount so keyboard and screen-reader users land on
 * the failure instead of at the top of the document.
 */
export function ErrorFallback({
  error,
  reset,
  source,
  standalone = false,
}: {
  error: CaughtError;
  reset: () => void;
  source: ErrorSource;
  standalone?: boolean;
}) {
  const t = useTranslations('common');
  const pathname = usePathname();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    reportError(error, { source });
  }, [error, source]);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const body = (
    <>
      <h1 ref={heading} tabIndex={-1} className="text-ink text-3xl font-semibold">
        {t('state.error')}
      </h1>
      <p className="text-muted mt-3 text-sm">{t('state.errorHint')}</p>
      {error.digest ? (
        <p className="text-muted mt-2 text-xs" data-testid="error-digest">
          {t('state.errorDigest', { digest: error.digest })}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-accent hover:bg-accent-bright rounded-[8px] px-4 py-2 text-sm font-semibold text-[#1b1b1b]"
        >
          {t('action.retry')}
        </button>
        <Link
          href={homeHref(pathname)}
          className="border-line text-ink hover:border-accent rounded-[8px] border px-4 py-2 text-sm font-medium"
        >
          {t('state.backHome')}
        </Link>
      </div>
    </>
  );

  if (standalone) {
    return (
      <main
        data-testid="error-fallback"
        className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-16"
      >
        {body}
      </main>
    );
  }

  return (
    <div
      data-testid="error-fallback"
      className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-4 py-12"
    >
      {body}
    </div>
  );
}
