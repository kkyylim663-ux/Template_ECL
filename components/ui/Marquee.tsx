import type { CSSProperties } from 'react';

/**
 * Scrolling announcement strip. Pure CSS (no JS, so it stays a server
 * component), pauses on hover, and stops entirely under
 * `prefers-reduced-motion` — see the rules in app/globals.css.
 *
 * The list is rendered twice so the translateX(-50%) loop is seamless.
 */
export function Marquee({
  items,
  durationSeconds = 30,
  label = 'Announcements',
  className,
}: {
  items: string[];
  durationSeconds?: number;
  label?: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      aria-label={label}
      className={`marquee border-line bg-panel-alt relative flex items-center overflow-hidden border-y ${className ?? ''}`}
      style={{ '--marquee-duration': `${durationSeconds}s` } as CSSProperties}
    >
      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
            {items.map((text, index) => (
              <li key={`${copy}-${index}`} className="flex items-center">
                <span className="bg-accent mx-4 size-1.5 shrink-0 rounded-full" aria-hidden />
                <span className="text-muted text-xs whitespace-nowrap">{text}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
