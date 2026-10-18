import type { ProviderSummary } from '@/lib/api/slots';
import { getT } from '@/lib/i18n/server';

/**
 * Provider rail (`section.home-section.has-space` + `.gamelist-home__wrapper`):
 * a horizontal strip of 160x48 logo tiles with 16px of padding top and bottom,
 * scrolling on its own. The tiles are not links on the reference build either —
 * they only show which studios the lobby carries. Desktop only.
 *
 * The original drives the strip with Swiper free-mode; a CSS loop keeps the
 * carousel plugin off this page (same trade-off as the hero in T26). Duration is
 * ours: the reference's Swiper config is in a lazy chunk, so it could not be
 * measured off the snapshot.
 */
export async function ProviderRail({ providers }: { providers: ProviderSummary[] }) {
  const { t } = await getT('home');
  if (providers.length === 0) return null;

  return (
    <section className="home-section hidden desktop:block">
      <h2 className="section-title">{t('section.providers')}</h2>
      <div className="marquee relative flex overflow-hidden">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} className="provider-rail flex shrink-0" aria-hidden={copy === 1}>
              {providers.map((provider) => (
                <li key={provider.id} className="provider-tile">
                  <img
                    src={`/providers/${provider.id}.webp`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="provider-tile__img"
                  />
                  <span className="sr-only">{provider.id}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
