import { getAnnouncements } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { Marquee } from '@/components/ui/Marquee';

const KIND_MARK: Record<string, string> = {
  urgent: '●',
  promo: '★',
  info: '·',
};

/**
 * Site-wide announcement strip. Server component: the text is in the first HTML
 * byte, it costs no client JS, hovering pauses it and `prefers-reduced-motion`
 * stops it (CSS in app/globals.css).
 */
export async function AnnouncementMarquee() {
  const [{ t }, announcements] = await Promise.all([getT('nav'), getAnnouncements()]);

  if (announcements.length === 0) return null;

  const items = announcements.map(
    (announcement) => `${KIND_MARK[announcement.kind] ?? '·'} ${announcement.title}`,
  );

  return (
    <Marquee
      label={t('ui.announcements')}
      items={items}
      durationSeconds={Math.max(24, items.length * 8)}
    />
  );
}
