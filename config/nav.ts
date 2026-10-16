import { brand } from './brand';
import type { IconName } from '@/components/ui/Icon';

/**
 * Site navigation. Routes live here; copy does not — every label is a key into
 * the `nav` namespace (messages/<locale>/nav.json), resolved by the component
 * that renders it, so the whole shell follows the language cookie.
 */

/** A menu entry whose label comes from the `nav` namespace. */
export type MenuLink = {
  /** Region-relative path, e.g. `/slots` — the shell prefixes `/{region}`. */
  href: string;
  /** Dotted key inside the `nav` namespace, e.g. `items.slots`. */
  labelKey: string;
  descKey?: string;
  icon?: IconName;
};

export type MenuGroup = { id: string; labelKey: string; items: MenuLink[] };
export type FooterGroup = { id: string; titleKey: string; items: MenuLink[] };

/**
 * Desktop primary menu: the three dropdown cards from UI_REFERENCE.md
 * (Games / Events / Account). Every href points at a real route from T02.
 */
export const PRIMARY_MENU: MenuGroup[] = [
  {
    id: 'games',
    labelKey: 'primary.games',
    items: [
      { href: '/slots', labelKey: 'items.slots', icon: 'slots', descKey: 'desc.slots' },
      { href: '/livecasino', labelKey: 'items.livecasino', icon: 'livecasino', descKey: 'desc.livecasino' },
      { href: '/sports', labelKey: 'items.sports', icon: 'sports', descKey: 'desc.sports' },
      { href: '/esports', labelKey: 'items.esports', icon: 'esports', descKey: 'desc.esports' },
      { href: '/fast-game', labelKey: 'items.fastGame', icon: 'fast', descKey: 'desc.fastGame' },
      { href: '/4d', labelKey: 'items.game4d', icon: 'dice4d', descKey: 'desc.game4d' },
      { href: '/numbergame', labelKey: 'items.numberGame', icon: 'numbers', descKey: 'desc.numberGame' },
      { href: '/prediction', labelKey: 'items.prediction', icon: 'prediction', descKey: 'desc.prediction' },
    ],
  },
  {
    id: 'events',
    labelKey: 'primary.events',
    items: [
      { href: '/promotion', labelKey: 'items.promotions', icon: 'gift', descKey: 'desc.promotions' },
      { href: '/update', labelKey: 'items.update', icon: 'news', descKey: 'desc.update' },
      { href: '/ranking-board', labelKey: 'items.rankingBoard', icon: 'trophy', descKey: 'desc.rankingBoard' },
      { href: '/vip', labelKey: 'items.vip', icon: 'crown', descKey: 'desc.vip' },
      { href: '/sponsor', labelKey: 'items.sponsor', icon: 'sponsor', descKey: 'desc.sponsor' },
    ],
  },
  {
    id: 'function',
    labelKey: 'primary.function',
    items: [
      { href: '/account/deposit', labelKey: 'items.deposit', icon: 'wallet' },
      { href: '/account/withdrawal', labelKey: 'items.withdrawal', icon: 'withdraw' },
      { href: '/account/transfer', labelKey: 'items.transfer', icon: 'transfer' },
      { href: '/account/history', labelKey: 'items.history', icon: 'history' },
      { href: '/account/pending', labelKey: 'items.pending', icon: 'pending' },
      { href: '/account/inbox', labelKey: 'items.inbox', icon: 'mail' },
      { href: '/account/rebates', labelKey: 'items.rebates', icon: 'rebate' },
      { href: '/account/achievement', labelKey: 'items.achievement', icon: 'achievement' },
      { href: '/account/tickets', labelKey: 'items.tickets', icon: 'ticket' },
      { href: '/account/profile', labelKey: 'items.profile', icon: 'user' },
    ],
  },
];

/** Left rail. Collapsed it is a 62px icon strip; expanded it is a 16rem panel. */
export const SIDEBAR_ITEMS: MenuLink[] = [
  { href: '', labelKey: 'items.lobby', icon: 'home' },
  { href: '/slots', labelKey: 'items.slots', icon: 'slots' },
  { href: '/livecasino', labelKey: 'items.livecasino', icon: 'livecasino' },
  { href: '/sports', labelKey: 'items.sports', icon: 'sports' },
  { href: '/esports', labelKey: 'items.esports', icon: 'esports' },
  { href: '/fast-game', labelKey: 'items.fastGame', icon: 'fast' },
  { href: '/4d', labelKey: 'items.game4d', icon: 'dice4d' },
  { href: '/numbergame', labelKey: 'items.numberGame', icon: 'numbers' },
  { href: '/promotion', labelKey: 'items.promotions', icon: 'gift' },
  { href: '/ranking-board', labelKey: 'items.rankingBoard', icon: 'trophy' },
  { href: '/vip', labelKey: 'items.vip', icon: 'crown' },
];

/**
 * Desktop footer: five blocks, in the original's order and with its wording
 * (crawl/pages/my.html). The first block is rendered from CONTACT_CHANNELS, the
 * rest are plain link lists. Widths in the original: 204 / 74 / 118 / 75 / 182 px
 * with ~162px between them (space-between inside the 1300px container).
 */
export const FOOTER_GROUPS: FooterGroup[] = [
  {
    id: 'help',
    titleKey: 'footer.title.help',
    items: [],
  },
  {
    id: 'games',
    titleKey: 'footer.title.games',
    items: [
      { href: '/esports', labelKey: 'items.esports' },
      { href: '/sports', labelKey: 'items.sports' },
      { href: '/livecasino', labelKey: 'items.livecasino' },
      { href: '/slots', labelKey: 'items.slots' },
      { href: '/4d', labelKey: 'footer.links.game4d' },
    ],
  },
  {
    id: 'payment',
    titleKey: 'footer.title.payment',
    items: [
      { href: '/account/deposit', labelKey: 'footer.links.localBanks' },
      { href: '/account/deposit', labelKey: 'footer.links.cryptocurrencies' },
      { href: '/account/deposit', labelKey: 'footer.links.paymentGateway' },
    ],
  },
  {
    id: 'special',
    titleKey: 'footer.title.special',
    items: [
      { href: '/promotion', labelKey: 'items.promotions' },
      { href: '/prediction', labelKey: 'items.prediction' },
      { href: '/ranking-board', labelKey: 'items.rankingBoard' },
    ],
  },
  {
    id: 'links',
    titleKey: 'footer.title.links',
    items: [
      { href: '/about', labelKey: 'footer.links.about' },
      { href: '/tnc', labelKey: 'footer.links.tnc' },
      { href: '/betting-rules', labelKey: 'footer.links.bettingRules' },
      // The original links its footer FAQ entry straight at /gettingstart.
      { href: '/faq/gettingstart', labelKey: 'footer.links.faq' },
    ],
  },
];

export const SOCIAL_LINKS = brand.social;

/**
 * Contact channels for the footer and the mobile drawer. Labels are translated;
 * `value` is data straight from the brand config (an address, a phone number).
 */
export type ContactChannel = {
  id: string;
  icon: IconName;
  href: string;
  labelKey: string;
  value?: string;
  valueKey?: string;
};

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    id: 'livechat',
    labelKey: 'support.liveChat',
    value: brand.contact.liveChat.availability,
    href: brand.contact.liveChat.href,
    icon: 'chat',
  },
  {
    id: 'email',
    labelKey: 'support.email',
    value: brand.contact.email,
    href: `mailto:${brand.contact.email}`,
    icon: 'mail',
  },
  {
    id: 'phone',
    labelKey: 'support.phone',
    value: brand.contact.phone,
    href: `tel:${brand.contact.phone.replace(/\s/g, '')}`,
    icon: 'phone',
  },
  {
    id: 'whatsapp',
    labelKey: 'support.whatsapp',
    valueKey: 'support.chatWithUs',
    href: brand.contact.whatsapp.href,
    icon: 'whatsapp',
  },
  {
    id: 'telegram',
    labelKey: 'support.telegram',
    valueKey: 'support.announcements',
    href: brand.contact.telegram.href,
    icon: 'telegram',
  },
];

/**
 * Mobile bottom bar: the original's five entries and order — Home / Chat /
 * Live Chat / Wallet / Profile. Chat has no widget in this build, so both chat
 * entries are `#` placeholders (same convention as the Play buttons).
 */
export const MOBILE_BAR_ITEMS: MenuLink[] = [
  { href: '', labelKey: 'bottom.home', icon: 'home' },
  { href: '#', labelKey: 'bottom.chat', icon: 'chat' },
  { href: '#', labelKey: 'bottom.liveChat', icon: 'chat' },
  { href: '/account/deposit', labelKey: 'bottom.wallet', icon: 'wallet' },
  { href: '/account/profile', labelKey: 'bottom.profile', icon: 'user' },
];

export function regionPath(region: string, href: string): string {
  return href ? `/${region}${href}` : `/${region}`;
}
