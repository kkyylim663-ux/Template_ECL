import { getT } from '@/lib/i18n/server';

/**
 * Provider rail (`section.home-section.has-space` + `.gamelist-home__wrapper`):
 * the reference's own 24 studio tiles — esports, live casino, slots and sports —
 * in its rendered order, scrolling on its own. The artwork is the original
 * site's `game-provider/my/...` set (`public/providers/rail/...`), with the
 * reference's alt names.
 *
 * The original drives the strip with Swiper free-mode; a CSS loop keeps the
 * carousel plugin off this page (same trade-off as the hero in T26). Duration is
 * ours: the reference's Swiper config is in a lazy chunk, so it could not be
 * measured off the snapshot.
 */
const HOME_RAIL: { src: string; label: string }[] = [
  { src: '/providers/rail/esports/cmd.jpg', label: 'cmd' },
  { src: '/providers/rail/esports/INPLAY.jpg', label: 'INPLAY' },
  { src: '/providers/rail/esports/SABA.jpg', label: 'SABA' },
  { src: '/providers/rail/esports/TF.jpg', label: 'TF' },
  { src: '/providers/rail/live/AG.jpg', label: 'AG' },
  { src: '/providers/rail/live/allbet.jpg', label: 'allbet' },
  { src: '/providers/rail/live/DG.jpg', label: 'DG' },
  { src: '/providers/rail/live/EVO.jpg', label: 'EVO' },
  { src: '/providers/rail/live/GP.jpg', label: 'GP' },
  { src: '/providers/rail/live/PP.jpg', label: 'PP' },
  { src: '/providers/rail/live/PT.jpg', label: 'PT' },
  { src: '/providers/rail/live/SG.jpg', label: 'SG' },
  { src: '/providers/rail/live/WM.jpg', label: 'WM' },
  { src: '/providers/rail/live/winfinity.jpg', label: 'winfinity' },
  { src: '/providers/rail/slots/CQ9.jpg', label: 'CQ9' },
  { src: '/providers/rail/slots/DREAMTECH.jpg', label: 'DREAMTECH' },
  { src: '/providers/rail/slots/GP.jpg', label: 'GP' },
  { src: '/providers/rail/slots/JOKER.jpg', label: 'JOKER' },
  { src: '/providers/rail/slots/PLAYNGO.jpg', label: 'PLAYNGO' },
  { src: '/providers/rail/slots/PP.jpg', label: 'PP' },
  { src: '/providers/rail/slots/PT.jpg', label: 'PT' },
  { src: '/providers/rail/slots/SPADE.jpg', label: 'SPADE' },
  { src: '/providers/rail/sports/cmd.jpg', label: 'cmd' },
  { src: '/providers/rail/sports/SABA.jpg', label: 'SABA' },
];

export async function ProviderRail() {
  const { t } = await getT('home');

  return (
    <section className="home-section hidden desktop:block">
      <h2 className="section-title">{t('section.providers')}</h2>
      <div className="marquee relative flex overflow-hidden">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} className="provider-rail flex shrink-0" aria-hidden={copy === 1}>
              {HOME_RAIL.map((tile) => (
                <li key={tile.src} className="provider-tile">
                  <img
                    src={tile.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="provider-tile__img"
                  />
                  <span className="sr-only">{tile.label}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
