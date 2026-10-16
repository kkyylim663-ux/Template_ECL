'use client';

import { useRouter } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';

/**
 * Returns a handler for the card's return control: step back in history, or go
 * to the region home when the visit has no history (a page opened from a link).
 */
export function useGoBack(region: string): () => void {
  const router = useRouter();

  return useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(`/${region}`);
  }, [router, region]);
}

/** The `.card-back` chevron on the login and forgot-password cards. */
export function CardBack({
  region,
  label,
  children,
}: {
  region: string;
  label: string;
  children: ReactNode;
}) {
  const goBack = useGoBack(region);

  return (
    <button type="button" className="card-back" aria-label={label} onClick={goBack}>
      {children}
    </button>
  );
}
