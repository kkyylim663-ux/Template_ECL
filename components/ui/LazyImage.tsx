'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Artwork slot with a real lazy-load: the <img> is only created once the box
 * comes near the viewport. When no image URL is configured (the P0 default, so
 * nothing external is fetched) the box shows a deterministic gradient derived
 * from `tone` plus the label, so a grid of placeholders still looks deliberate.
 */
export function LazyImage({
  src,
  alt,
  tone = 42,
  ratio = '3 / 4',
  className,
  children,
}: {
  src?: string | null;
  alt: string;
  /** Hue for the placeholder gradient. */
  tone?: number;
  ratio?: string;
  className?: string;
  /** Overlay content, e.g. the hover buttons on a game card. */
  children?: ReactNode;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      // Start a little early so the image is usually there before it is seen.
      { rootMargin: '240px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={holder}
      data-loaded={src && inView ? 'true' : 'false'}
      style={{ aspectRatio: ratio, '--tone': String(tone) } as CSSProperties}
      className={`bg-panel-soft relative overflow-hidden ${className ?? ''}`}
    >
      {src && inView ? (
        // eslint-disable-next-line @next/next/no-img-element -- artwork host is configurable, next/image needs a fixed loader
        <img src={src} alt={alt} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <div className="game-placeholder size-full">
          <span className="text-muted line-clamp-2 px-2 text-center text-[11px] font-medium">
            {alt}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
