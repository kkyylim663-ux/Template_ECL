'use client';

import { useEffect } from 'react';
import { brand } from '@/config/brand';
import { reportError, type CaughtError } from '@/lib/report-error';
import './globals.css';

/**
 * Last resort: the root layout itself failed, so there is no shell, no intl
 * provider and no route params left — this file must ship its own `<html>` and
 * `<body>`, and it carries English copy on purpose (nothing can translate it
 * here; the brand's own demo notice is English too). `reset()` is the only
 * recovery Next offers at this level.
 */
export default function GlobalError({ error, reset }: { error: CaughtError; reset: () => void }) {
  useEffect(() => {
    reportError(error, { source: 'global' });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-surface text-ink font-sans antialiased">
        <main
          data-testid="global-error"
          className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-16"
        >
          <p className="text-muted text-xs font-medium tracking-[0.2em] uppercase">{brand.name}</p>
          <h1 className="text-ink mt-3 text-3xl font-semibold">Something went wrong</h1>
          <p className="text-muted mt-3 text-sm">The application failed to start. Please try again.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={reset}
              className="bg-accent hover:bg-accent-bright rounded-[8px] px-4 py-2 text-sm font-semibold text-[#1b1b1b]"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
