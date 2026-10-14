'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export type TocItem = { id: string; title: string };

/**
 * Table of contents for the long-form pages: a sticky rail on desktop and a
 * dropdown at the top on mobile. The active section is derived from the scroll
 * position (the last heading above the fold line), which is what the highlight
 * on the rail follows.
 */
export function PageToc({ items }: { items: TocItem[] }) {
  const t = useTranslations('content');
  const [active, setActive] = useState(items[0]?.id ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.scrollY + 150;
      let current = sections[0].id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top + window.scrollY <= line) current = section.id;
      }
      // At the very bottom the last heading may never reach the line.
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        current = sections[sections.length - 1].id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  const linkClass = (id: string) =>
    `block border-l-2 py-1 pl-3 text-xs transition-colors ${
      id === active
        ? 'border-accent text-ink font-medium'
        : 'border-transparent text-muted hover:text-ink'
    }`;

  return (
    <>
      {/* Desktop: sticky rail beside the body. */}
      <nav
        aria-label={t('longform.toc')}
        data-toc="desktop"
        className="hidden self-start desktop:sticky desktop:top-24 desktop:block"
      >
        <p className="text-muted pl-3 text-xs font-semibold">{t('longform.toc')}</p>
        <ol className="border-line mt-2 border-l">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                data-toc-link={item.id}
                aria-current={item.id === active ? 'true' : undefined}
                className={linkClass(item.id)}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mobile: the same list collapsed into a dropdown. */}
      <details
        data-toc="mobile"
        open={open}
        onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
        className="border-line bg-panel rounded-[var(--radius-panel)] border desktop:hidden"
      >
        <summary className="text-ink flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
          {t('longform.toc')}
          <Icon name="chevronDown" size={16} className="text-muted" />
        </summary>
        <ol className="border-line border-t px-4 py-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                data-toc-link={item.id}
                aria-current={item.id === active ? 'true' : undefined}
                onClick={() => setOpen(false)}
                className="text-muted hover:text-ink block py-2 text-xs"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
