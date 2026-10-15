'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Banner } from '@/lib/api/schemas';

/** Autoplay cadence, in ms. Matches the reference build's 5.2 s. */
const DELAY = 5200;

function hrefFor(region: string, href: string): string {
  if (!href || href === '#') return '#';
  return href.startsWith('/') ? `/${region}${href}` : href;
}

/**
 * Home hero (`.home-banner`): 320px on desktop, 70vw on mobile, 15px radius, the
 * active slide outlined in mustard and the others dimmed to 50%. T12 shipped this
 * on Swiper; T26 replaced it with a track that translates by one slide, which
 * takes the carousel plugin's JS and CSS off the home page.
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

  const step = (delta: number) => setIndex((current) => (current + delta + count) % count);

  return (
    <div className="home-banner bleed-mobile mt-[29px] mb-[10px] desktop:mb-5 desktop:min-h-[308px]">
      <div
        data-carousel="home"
        aria-roledescription="carousel"
        aria-label={t('hero.carouselLabel')}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        className="home-banner-container"
      >
        <div className="h-full overflow-hidden rounded-[var(--radius-panel)]">
          <div
            className="flex h-full transition-transform duration-500 motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {banners.map((banner, position) => {
              const href = hrefFor(region, banner.href);
              const active = position === index;
              return (
                <div
                  key={banner.id}
                  data-banner-slide={banner.id}
                  data-active={active}
                  // Off-screen slides leave the tab order and the accessibility tree.
                  {...(active ? {} : { inert: true })}
                  className="hero-slide h-full w-full shrink-0"
                >
                  <Link
                    href={href}
                    onClick={(event) => {
                      if (href === '#') event.preventDefault();
                    }}
                    className="game-placeholder data-[active=true]:border-accent flex h-full flex-col justify-center rounded-[var(--radius-panel)] border-2 border-transparent p-6 max-desktop:ps-20 desktop:p-10"
                  >
                    <span className="block max-w-lg">
                      <span className="text-ink block text-lg font-semibold desktop:text-3xl">
                        {banner.title}
                      </span>
                      <span className="text-ink/85 mt-1.5 block text-xs desktop:mt-3 desktop:text-base">
                        {banner.subtitle}
                      </span>
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              data-banner-step="prev"
              onClick={() => step(-1)}
              aria-label={t('hero.goToSlide', { index: ((index - 1 + count) % count) + 1 })}
              className="hero-arrow hero-arrow--prev"
            >
              <Icon name="chevronLeft" size={28} />
            </button>
            <button
              type="button"
              data-banner-step="next"
              onClick={() => step(1)}
              aria-label={t('hero.goToSlide', { index: ((index + 1) % count) + 1 })}
              className="hero-arrow hero-arrow--next"
            >
              <Icon name="chevronRight" size={28} />
            </button>

            <div className="hero-dots">
              {banners.map((banner, position) => (
                <button
                  key={banner.id}
                  type="button"
                  data-banner-dot={position}
                  onClick={() => setIndex(position)}
                  aria-label={t('hero.goToSlide', { index: position + 1 })}
                  aria-current={position === index ? 'true' : undefined}
                  className="hero-dot"
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
