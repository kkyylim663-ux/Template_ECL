import { ProviderCardGrid } from '@/components/game/ProviderCardGrid';
import { BettingTransaction } from '@/components/home/BettingTransaction';
import { getHomeBetting, type VpnDemo } from '@/lib/api';
import { getT } from '@/lib/i18n/server';

export type CategoryLobbyProps = {
  region: string;
  /** The category id the cards belong to (`livecasino` / `sports` / `esports`). */
  category: 'livecasino' | 'sports' | 'esports';
  /** Heading inside the `games` namespace, e.g. `category.livecasino`. */
  headingKey: string;
  tone: number;
  /** Page-banner slug: `public/banners/pages/<heroSlug>-desktop|mobile.webp`. */
  heroSlug: string;
  providers: { id: string; isNew: boolean }[];
  /** The reference shows the VPN dialog on livecasino and esports only. */
  vpnNotice?: boolean;
  vpnDemo?: VpnDemo;
};

/**
 * The three studio pages share the reference build's block order: banner, the
 * `form-title` heading with its page icon, the `Game Providers` section title
 * (`.banner-top`) and the `.game-wrapper` grid — then the same Betting
 * Transaction block the home page carries (its markup exists on all three
 * reference pages). The page wraps everything in the `games` + `home`
 * namespaces, because the betting block speaks `home`.
 */
export async function CategoryLobby({
  region,
  category,
  headingKey,
  tone,
  heroSlug,
  providers,
  vpnNotice = false,
  vpnDemo,
}: CategoryLobbyProps) {
  const [{ t }, { t: tHome }] = await Promise.all([getT('games'), getT('home')]);
  const betting = await getHomeBetting();

  return (
    <div>
      <section data-part="banner-section" aria-hidden className="page-hero game-banner">
        <picture>
          <source media="(max-width: 768px)" srcSet={`/banners/pages/${heroSlug}-mobile.webp`} />
          <img
            className="banner-section-img hover-grow"
            src={`/banners/pages/${heroSlug}-desktop.webp`}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </picture>
      </section>

      <h1 className="page-title has-space">
        <span
          aria-hidden
          className="page-title__icon game-placeholder"
          style={{ '--tone': String(tone) } as React.CSSProperties}
        />
        {t(headingKey)}
      </h1>

      <h2 className="section-title banner-top has-space">{tHome('section.providers')}</h2>

      <ProviderCardGrid
        providers={providers}
        category={category}
        region={region}
        vpnNotice={vpnNotice}
        vpnDemo={vpnDemo}
      />

      <BettingTransaction betting={betting} region={region} />
    </div>
  );
}
