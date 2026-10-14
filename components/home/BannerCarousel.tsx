'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type CSSProperties } from 'react';
import type { Banner } from '@/lib/api/schemas';

/** Autoplay cadence, in ms. Matches the reference build's 5.2 s. */
const DELAY = 5200;

function hrefFor(region: string, href: string): string {
  if (!href || href === '#') return '#';
  return href.startsWith('/') ? `/${region}${href}` : href;
}

/**
 * Home carousel. T12 shipped this on Swiper; T26 replaced it with a track that
 * translates by one slide, which takes the carousel plugin's JS and CSS off the
 * home page. Behaviour is unchanged: autoplay unless the reader asked for reduced
 * motion, pause while hovered or focused, and inert slides when they have no
 * destination.
 */
export function BannerCarousel({ banners, region }: { banners: Banner[]; region: string }) {
  const t = useTranslations('home');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const count = banners.length;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || count < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), DELAY);
    return () => window.clearInterval(timer);
  }, [count, paused, reduceMotion]);

  if (count === 0) return null;

  return (
    <section
      data-carousel="home"
      aria-roledescription="carousel"
      aria-label={t('hero.carouselLabel')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative overflow-hidden rounded-[var(--radius-panel)]"
    >
      <div
        className="flex transition-transform duration-500 motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((banner, position) => {
          const href = hrefFor(region, banner.href);
          return (
            <div
              key={banner.id}
              data-banner-slide={banner.id}
              // Off-screen slides leave the tab order and the accessibility tree.
              {...(position === index ? {} : { inert: true })}
              className="w-full shrink-0"
            >
              <Link
                href={href}
                onClick={(event) => {
                  if (href === '#') event.preventDefault();
                }}
                style={{ '--tone': String(banner.tone) } as CSSProperties}
                className="game-placeholder block h-[190px] rounded-[var(--radius-panel)] p-6 desktop:h-[300px] desktop:p-10"
              >
                <span className="block max-w-lg">
                  <span className="text-ink block text-lg font-semibold desktop:text-3xl">
                    {banner.title}
                  </span>
                  <span className="text-ink/85 mt-1.5 block text-xs desktop:mt-3 desktop:text-base">
                    {banner.subtitle}
                  </span>
                  <span className="bg-accent mt-4 inline-block rounded-[8px] px-4 py-2 text-xs font-semibold text-[#1b1b1b] desktop:mt-6 desktop:text-sm">
                    {t('hero.cta')}
                  </span>
                </span>
              </Link>
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 desktop:bottom-5">
          {banners.map((banner, position) => (
            <button
              key={banner.id}
              type="button"
              data-banner-dot={position}
              onClick={() => setIndex(position)}
              aria-label={t('hero.goToSlide', { index: position + 1 })}
              aria-current={position === index ? 'true' : undefined}
              className={`size-2.5 rounded-full transition-colors ${
                position === index ? 'bg-accent' : 'bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
