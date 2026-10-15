/**
 * Every brand value the UI renders comes from here — name, logo, colours,
 * contact details, social links, legal notices. Replace the placeholder values
 * in this one file (and drop real artwork into `public/brand/`) and the whole
 * site re-brands itself.
 *
 * Nothing in this file may be copied from the reference site: the values below
 * are invented placeholders.
 */

export const brand = {
  name: 'BRAND',
  shortName: 'BRAND',
  legalName: 'BRAND Entertainment Ltd. (placeholder)',

  tagline: 'Malaysia & Singapore',

  logo: {
    /** Served from `public/`. Swap the file, keep the path. */
    src: '/brand/logo.svg',
    /** Wordmark rendered next to the mark; also the fallback if the file is missing. */
    text: 'BRAND',
    alt: 'BRAND logo',
    width: 32,
    height: 32,
  },

  /** Browser UI colour (address bar on mobile). */
  themeColor: '#18191a',

  /**
   * Colour tokens, mirroring docs/UI_REFERENCE.md and (from T29) the measured
   * values in docs/FIDELITY_TOKENS.md. `app/globals.css` declares the same values
   * as CSS variables, which is what components actually consume; keep the two in
   * sync when re-branding. Values here are for metadata and JS-side art
   * (gradients).
   */
  colors: {
    /** Page background. */
    surface: '#18191a',
    /** Panels: mobile header/footer, cards. */
    panel: '#242526',
    panelAlt: '#272727',
    /** Desktop header + sidebar base (--color-primary-grey). */
    panelSoft: '#2d2e30',
    /** Dropdown panels. */
    dropdown: '#202020',
    /** Modals. */
    modal: '#171717',
    /** Modal inset blocks (.info-rule__content). */
    modalInset: '#1e2020',
    /** Tinted panels (.info-rule__header). */
    tint: '#252727',
    /** Mobile card artwork area. */
    visual: '#2c2c2e',
    /** Separators. */
    line: '#333435',
    lineAlt: '#3a3b3c',
    lineMuted: '#47494b',
    /** Primary accent (mustard) — buttons, hover underline, tags. */
    accent: '#fabb2e',
    accentBright: '#ffbf29',
    /** Dark accent edge used by the -5px/5px edge shadows. */
    accentDark: '#856b33',
    /** Secondary accent (green) — tags, success. */
    success: '#289d82',
    /** New tag, errors. */
    danger: '#cc3633',
    /** Warning / orange badges. */
    warn: '#ffa469',
    /** VIP gold. */
    gold: '#f9d235',
    text: '#ffffff',
    textMuted: '#b2b2b2',
    textDim: '#737373',
  },

  contact: {
    /** Live chat is a placeholder in P0: no widget is loaded. */
    liveChat: { label: 'Live chat', href: '#', availability: '24/7' },
    email: 'help@brand.example',
    phone: '+60 3-0000 0000',
    whatsapp: { label: 'WhatsApp', href: '#' },
    telegram: { label: 'Telegram', href: '#' },
  },

  social: [
    { id: 'facebook', label: 'Facebook', href: '#' },
    { id: 'telegram', label: 'Telegram', href: '#' },
    { id: 'instagram', label: 'Instagram', href: '#' },
    { id: 'x', label: 'X', href: '#' },
    { id: 'youtube', label: 'YouTube', href: '#' },
  ],

  legal: {
    operator: 'BRAND Entertainment Ltd. (placeholder)',
    licence: 'Demo build — placeholder licence number 0000-DEMO',
    ageNotice: '18+ only. Play responsibly.',
    noticesUrl: '#',
    demoNotice: 'Demo build: placeholder brand, fake data, no real money.',
  },

  /** Markets the site serves. Currency follows the region, not the language. */
  regions: {
    my: { code: 'my', label: 'Malaysia', currency: 'MYR', symbol: 'RM', dialCode: '+60' },
    sg: { code: 'sg', label: 'Singapore', currency: 'SGD', symbol: 'S$', dialCode: '+65' },
  },
} as const;

export type RegionCode = keyof typeof brand.regions;

export const REGION_CODES = Object.keys(brand.regions) as RegionCode[];

export const DEFAULT_REGION: RegionCode = 'my';

export function isRegionCode(value: string): value is RegionCode {
  return (REGION_CODES as readonly string[]).includes(value);
}

export function regionConfig(code: RegionCode) {
  return brand.regions[code];
}
