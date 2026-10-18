import { InertLink } from '@/components/ui/InertLink';
import { getT } from '@/lib/i18n/server';

/**
 * App-download blocks. The original ships two: a 1300x340 banner on desktop
 * (`.home-download`, 537px copy column + artwork) and a sideways-scrolling rail of
 * two cards on mobile (`.home-section.mobile` + `.home-download__wrapper`).
 *
 * The store badges are the reference's own artwork
 * (`public/home/download-{google-play,app-store}.webp`, pulled from the
 * original). The wrapper geometry (10px padding, 15px radius, #1f1c1d fill) is
 * the measured one.
 */
export async function AppDownload() {
  const { t } = await getT('home');

  return (
    <>
      <section className="home-section hidden desktop:block">
        <div className="flex h-[340px] overflow-hidden rounded-[var(--radius-panel)]">
          <div className="bg-download-left text-ink flex w-[537px] shrink-0 flex-col justify-center pl-[66px]">
            <p className="mb-2 text-xs leading-[normal]">{t('download.title')}</p>
            <p className="mb-3 text-32 leading-[normal] font-bold">{t('download.headline')}</p>
            <p className="mb-[48px] text-sm leading-[normal]">{t('download.body')}</p>
            <div className="flex gap-[24px]">
              <Badge src="/home/download-app-store.webp" alt={t('download.appStore')} />
              <Badge src="/home/download-google-play.webp" alt={t('download.googlePlay')} />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <img
              className="h-full w-full object-cover"
              src="/home/download-app.webp"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="home-section bleed-mobile desktop:hidden">
        {/* The title carries `has-space` on the original; the rail does not. */}
        <h2 className="section-title mx-[var(--pad-mobile-x)]">{t('download.section')}</h2>
        <div className="flex flex-nowrap overflow-x-auto pl-[var(--pad-mobile-x)]">
          {(['download.cardOne', 'download.cardTwo'] as const).map((key, index) => (
            <div
              key={key}
              className="bg-download-card mr-[10px] min-w-[56%] rounded-[var(--radius-panel)] p-[15px] pb-[25px]"
            >
              <InertLink className="bg-inset-dark mb-[10px] block rounded-[var(--radius-panel)] p-[10px]">
                <img
                  className="block h-[44px] w-full rounded-[10px] object-contain"
                  src={
                    index === 0
                      ? '/home/download-google-play.webp'
                      : '/home/download-app-store.webp'
                  }
                  alt={t(index === 0 ? 'download.googlePlay' : 'download.appStore')}
                  loading="lazy"
                  decoding="async"
                />
              </InertLink>
              <p className="text-ink mb-1 text-sm leading-[normal] font-medium">{t(key)}</p>
              <p className="text-ink text-xs leading-[normal]">{t('download.cardSub')}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** A store badge (155x44) — the reference's own artwork. */
function Badge({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      className="h-[44px] w-[155px] rounded-[var(--radius-10)] object-contain"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
