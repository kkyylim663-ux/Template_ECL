'use client';

import type { ReactNode } from 'react';

/**
 * A link that goes nowhere. P0 has several "should exist eventually" targets
 * (blockchain explorers, external odds pages); they render as real anchors with
 * `#` and swallow the click, so nothing ever leaves the page.
 */
export function InertLink({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <a
      href="#"
      aria-label={ariaLabel}
      onClick={(event) => event.preventDefault()}
      className={className}
    >
      {children}
    </a>
  );
}
