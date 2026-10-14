'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { useModal } from '@/components/ui/ModalProvider';
import { Icon } from '@/components/ui/Icon';
import type { SponsorPayload } from '@/lib/api';

/**
 * Sponsor page blocks. The logo carousel is a Swiper like the home banner (same
 * reduced-motion rule); the videos are cards whose play button opens a note that
 * this build embeds nothing — no player, no external asset.
 */
export function SponsorGallery({ sponsor }: { sponsor: SponsorPayload }) {
  const t = useTranslations('content');
  const modal = useModal();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="min-w-0">
      <section>
        <h2 className="text-ink text-sm font-semibold">{t('sponsor.logoTitle')}</h2>
        {/* `overflow-hidden` keeps the Swiper from widening the page at 375px. */}
        <div className="mt-3 min-w-0 overflow-hidden">
          <Swiper
            modules={[Autoplay, Pagination]}
            slidesPerView={2}
            spaceBetween={12}
            loop={sponsor.logoEvolution.length > 2}
            autoplay={reduceMotion ? false : { delay: 4200, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            breakpoints={{ 769: { slidesPerView: 5, spaceBetween: 16 } }}
            className="logo-carousel rounded-[var(--radius-panel)] pb-8"
            data-part="logo-evolution-card"
          >
            {sponsor.logoEvolution.map((entry) => (
              <SwiperSlide key={entry.id}>
                <article
                  data-logo-era={entry.era}
                  className="border-line bg-panel rounded-[var(--radius-panel)] border p-3"
                >
                  <span
                    aria-hidden
                    className="game-placeholder grid h-16 place-items-center rounded-[10px] text-[10px] font-semibold text-white/85"
                    style={{ '--tone': String(entry.tone) } as React.CSSProperties}
                  >
                    {entry.era}
                  </span>
                  <p className="text-ink mt-2 text-xs font-medium">{entry.label}</p>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-ink text-sm font-semibold">{t('sponsor.videosTitle')}</h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 desktop:grid-cols-3 desktop:gap-5">
          {sponsor.videos.map((video) => (
            <li key={video.id}>
              <button
                type="button"
                data-video={video.id}
                onClick={() => modal.message(t('sponsor.videoTitle'), t('sponsor.videoBody'))}
                className="border-line bg-panel hover:border-accent w-full rounded-[var(--radius-panel)] border p-3 text-left transition-colors"
              >
                <span
                  aria-hidden
                  className="game-placeholder relative flex h-32 items-center justify-center rounded-[10px]"
                  style={{ '--tone': String(video.tone) } as React.CSSProperties}
                >
                  <span className="bg-accent grid size-11 place-items-center rounded-full text-[#1b1b1b]">
                    <Icon name="play" size={20} />
                  </span>
                  <span className="absolute right-2 bottom-2 rounded-[6px] bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
                    {video.duration}
                  </span>
                </span>
                <span className="text-ink mt-2 block text-xs font-medium">{video.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-ink text-sm font-semibold">{t('sponsor.partnersTitle')}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 desktop:grid-cols-4">
          {sponsor.partners.map((partner) => (
            <li
              key={partner.id}
              data-partner={partner.id}
              className="border-line bg-panel flex items-center gap-3 rounded-[var(--radius-panel)] border p-3"
            >
              <span
                aria-hidden
                className="game-placeholder size-9 shrink-0 rounded-[10px]"
                style={{ '--tone': String(partner.tone) } as React.CSSProperties}
              />
              <span className="min-w-0">
                <span className="text-ink block truncate text-xs font-medium">{partner.name}</span>
                <span className="text-muted block truncate text-[10px]">{partner.kind}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
