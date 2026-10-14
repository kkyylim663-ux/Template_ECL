'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { IconSprite } from '@/components/ui/IconSprite';

/**
 * "Back to top" for the long-form pages. It stays out of the way until the
 * reader is past the first screen, then scrolls the document up — instantly when
 * the visitor asked for reduced motion.
 */
export function BackToTop() {
  const t = useTranslations('content');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Visible once the reader is past the first screen, and it stays visible on
    // the way back up: hiding it mid-scroll (the button may hold focus) would
    // cancel the smooth scroll before it reaches the top.
    const onScroll = () => {
      const y = window.scrollY;
      setVisible((current) => (y > 600 ? true : y <= 2 ? false : current));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      data-back-to-top
      hidden={!visible}
      aria-label={t('longform.backToTop')}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        })
      }
      className="border-line bg-panel text-ink hover:border-accent fixed right-4 bottom-20 z-10 grid size-11 place-items-center rounded-full border shadow-lg desktop:right-8 desktop:bottom-8"
    >
      <IconSprite only={['chevronUp']} />
      <Icon name="chevronUp" size={18} />
    </button>
  );
}
