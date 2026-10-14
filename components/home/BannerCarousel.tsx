'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type CSSProperties } from 'react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import type { Banner } from '@/lib/api/schemas';

function hrefFor(region: string, href: string): string {
  if (!href || href === '#') return '#';
  return href.startsWith('/') ? `/${region}${href}` : href;
}

/**
 * Home carousel (Swiper, as in the reference build). Autoplay stops for readers
 * who ask for reduced motion, and the slides are inert links when they have no
 * destination, so nothing lands on a dead page.
 */
export function BannerCarousel({ banners, region }: { banners: Banner[]; region: string }) {
  const t = useTranslations('home');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  if (banners.length === 0) return null;

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      slidesPerView={1}
      spaceBetween={16}
      loop={banners.length > 1}
      autoplay={reduceMotion ? false : { delay: 5200, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      className="home-carousel rounded-[var(--radius-panel)]"
    >
      {banners.map((banner) => {
        const href = hrefFor(region, banner.href);
        return (
          <SwiperSlide key={banner.id}>
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
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
