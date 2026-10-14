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
  themeColor: '#0b1220',

  /**
   * Colour tokens. `app/globals.css` declares the same values as CSS variables,
   * which is what components actually consume; keep the two in sync when
   * re-branding. Values here are for metadata and JS-side art (gradients).
   */
  colors: {
    accent: '#22c07a',
    accentContrast: '#04150d',
    surface: '#0b1220',
    surfaceRaised: '#131c2e',
    border: '#26324a',
    text: '#e8edf7',
    textMuted: '#94a3b8',
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
