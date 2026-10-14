import { brand } from './brand';
import type { IconName } from '@/components/ui/Icon';

export type NavItem = {
  /** Region-relative path, e.g. `/slots` — the shell prefixes `/{region}`. */
  href: string;
  label: string;
  icon?: IconName;
  description?: string;
};

/**
 * Desktop primary menu: the three dropdown cards from UI_REFERENCE.md
 * (Games / Events / Function). Every href points at a real route from T02.
 */
export const PRIMARY_MENU: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: 'games',
    label: 'Games',
    items: [
      { href: '/slots', label: 'Slots', icon: 'slots', description: '6,000+ titles' },
      { href: '/livecasino', label: 'Live casino', icon: 'livecasino', description: 'Live dealers' },
      { href: '/sports', label: 'Sports', icon: 'sports', description: 'Pre-match and live' },
      { href: '/esports', label: 'Esports', icon: 'esports', description: 'Major tournaments' },
      { href: '/fast-game', label: 'Fast games', icon: 'fast', description: 'Rounds in seconds' },
      { href: '/4d', label: '4D', icon: 'dice4d', description: 'Four draws a week' },
      { href: '/numbergame', label: 'Number game', icon: 'numbers', description: 'Draw every 5 min' },
      { href: '/prediction', label: 'Prediction', icon: 'prediction', description: 'Free entry' },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    items: [
      { href: '/promotion', label: 'Promotions', icon: 'gift', description: 'Bonuses and rebates' },
      { href: '/update', label: 'News', icon: 'news', description: 'Product updates' },
      { href: '/ranking-board', label: 'Ranking board', icon: 'trophy', description: 'Weekly race' },
      { href: '/vip', label: 'VIP', icon: 'crown', description: 'Tiers and hosts' },
      { href: '/sponsor', label: 'Sponsorship', icon: 'sponsor', description: 'Teams we back' },
    ],
  },
  {
    id: 'function',
    label: 'Account',
    items: [
      { href: '/account/deposit', label: 'Deposit', icon: 'wallet' },
      { href: '/account/withdrawal', label: 'Withdrawal', icon: 'withdraw' },
      { href: '/account/transfer', label: 'Transfer', icon: 'transfer' },
      { href: '/account/history', label: 'History', icon: 'history' },
      { href: '/account/pending', label: 'Pending transactions', icon: 'pending' },
      { href: '/account/inbox', label: 'Inbox', icon: 'mail' },
      { href: '/account/rebates', label: 'Rebates', icon: 'rebate' },
      { href: '/account/achievement', label: 'Achievements', icon: 'achievement' },
      { href: '/account/tickets', label: 'Ticket center', icon: 'ticket' },
      { href: '/account/profile', label: 'Profile', icon: 'user' },
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
