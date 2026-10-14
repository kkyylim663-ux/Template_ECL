import { brand } from './brand';
import type { IconName } from '@/components/ui/Icon';

export type NavItem = {
  /** Region-relative path, e.g. `/slots` — the shell prefixes `/{region}`. */
  href: string;
  label: string;
  icon?: IconName;
  description?: string;
};

/** A menu entry whose copy lives in `messages/<locale>/nav.json`. */
export type MenuLink = {
  href: string;
  /** Dotted key inside the `nav` namespace, e.g. `items.slots`. */
  labelKey: string;
  descKey?: string;
  icon?: IconName;
};

export type MenuGroup = { id: string; labelKey: string; items: MenuLink[] };

/**
 * Desktop primary menu: the three dropdown cards from UI_REFERENCE.md
 * (Games / Events / Account). Every href points at a real route from T02.
 * Copy comes from the `nav` namespace so the menu follows the language cookie.
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
    labelKey: 'primary.account',
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
export const SIDEBAR_ITEMS: NavItem[] = [
  { href: '', label: 'Lobby', icon: 'home' },
  { href: '/slots', label: 'Slots', icon: 'slots' },
  { href: '/livecasino', label: 'Live casino', icon: 'livecasino' },
  { href: '/sports', label: 'Sports', icon: 'sports' },
  { href: '/esports', label: 'Esports', icon: 'esports' },
  { href: '/fast-game', label: 'Fast games', icon: 'fast' },
  { href: '/4d', label: '4D', icon: 'dice4d' },
  { href: '/numbergame', label: 'Number game', icon: 'numbers' },
  { href: '/promotion', label: 'Promotions', icon: 'gift' },
  { href: '/ranking-board', label: 'Ranking board', icon: 'trophy' },
  { href: '/vip', label: 'VIP', icon: 'crown' },
];

export const FOOTER_GROUPS: { id: string; title: string; items: NavItem[] }[] = [
  {
    id: 'help',
    title: 'Help',
    items: [
      { href: '/faq/gettingstart', label: 'Getting started' },
      { href: '/faq/finance', label: 'Deposits and withdrawals' },
      { href: '/faq/games', label: 'Games and providers' },
      { href: '/faq/promotions', label: 'Vouchers and rewards' },
      { href: '/faq/contactus', label: 'Contacting support' },
    ],
  },
  {
    id: 'company',
    title: 'Company',
    items: [
      { href: '/about', label: 'About us' },
      { href: '/contact', label: 'Contact us' },
      { href: '/sponsor', label: 'Sponsorship' },
      { href: '/update', label: 'News' },
    ],
  },
  {
    id: 'legal',
    title: 'Legal',
    items: [
      { href: '/tnc', label: 'Terms & conditions' },
      { href: '/betting-rules', label: 'Betting rules' },
      { href: '/faq/downloadapp', label: 'Mobile app' },
    ],
  },
];

export const SOCIAL_LINKS = brand.social;

/** Contact channels shown in the footer and the mobile drawer. */
export const CONTACT_CHANNELS = [
  { id: 'livechat', label: brand.contact.liveChat.label, value: brand.contact.liveChat.availability, href: brand.contact.liveChat.href, icon: 'chat' as IconName },
  { id: 'email', label: 'Email', value: brand.contact.email, href: `mailto:${brand.contact.email}`, icon: 'mail' as IconName },
  { id: 'phone', label: 'Phone', value: brand.contact.phone, href: `tel:${brand.contact.phone.replace(/\s/g, '')}`, icon: 'phone' as IconName },
  { id: 'whatsapp', label: brand.contact.whatsapp.label, value: 'Chat with us', href: brand.contact.whatsapp.href, icon: 'whatsapp' as IconName },
  { id: 'telegram', label: brand.contact.telegram.label, value: 'Announcements', href: brand.contact.telegram.href, icon: 'telegram' as IconName },
];

/** Mobile bottom bar: five entries, as on the reference build. */
export const MOBILE_BAR_ITEMS: NavItem[] = [
  { href: '', label: 'Home', icon: 'home' },
  { href: '/slots', label: 'Games', icon: 'slots' },
  { href: '/promotion', label: 'Promo', icon: 'gift' },
  { href: '/ranking-board', label: 'Ranking', icon: 'trophy' },
  { href: '/account/profile', label: 'Me', icon: 'user' },
];

export function regionPath(region: string, href: string): string {
  return href ? `/${region}${href}` : `/${region}`;
}
