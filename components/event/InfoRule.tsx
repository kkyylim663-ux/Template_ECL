import type { ReactNode } from 'react';

/**
 * The reference's `.info-rule__*` rule panel: a #252727 capsule with a 41px
 * circular toggle that rotates 180deg while open, and the answer in a #1e2020
 * panel below. The reference drives it with JS; `<details>` gives the same
 * behaviour and keeps the page server-rendered. `defaultOpen` is for callers
 * whose rules read as page copy rather than as an aside.
 */
export function InfoRule({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="info-rule__container" open={defaultOpen}>
      <summary className="info-rule__header">
        <span>{title}</span>
        <span className="info-rule__btn-toggle" aria-hidden>
          {/* `icon_triangle_solid_white.svg` in the reference; inlined here so the
              sprite keeps only the shell's icons. */}
          <svg viewBox="0 0 12 8" width="12" height="8" focusable="false">
            <path d="M6 0.6 11.4 7.4H0.6z" fill="currentColor" />
          </svg>
        </span>
      </summary>
      <div className="info-rule__content">{children}</div>
    </details>
  );
}
