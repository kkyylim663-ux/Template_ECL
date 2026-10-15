'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { IconSprite } from '@/components/ui/IconSprite';
import type { FaqItem } from '@/lib/api';

/**
 * One FAQ topic: a search box that filters inside the topic, and the questions as
 * an accordion. Filtering and highlighting run over the items the server already
 * sent — the answers are in the first HTML byte, and no request is made here.
 */
export function FaqPanel({ topicId, items }: { topicId: string; items: FaqItem[] }) {
  const t = useTranslations('content');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? items.filter(
        (item) =>
          item.q.toLowerCase().includes(needle) || item.a.toLowerCase().includes(needle),
      )
    : items;

  function highlight(text: string): ReactNode {
    if (!needle) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, 'ig'));
    return parts.map((part, index) =>
      part.toLowerCase() === needle ? (
        <mark key={index} className="bg-accent/35 text-ink rounded-[3px] px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }

  return (
    <div data-faq-topic={topicId}>
      <IconSprite only={['search']} />
      {/* The reference has no search box on this template; it is a P1 addition, so
          it keeps its own compact skin rather than a `.generalPage` one. */}
      <div className="relative">
        <span className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          <Icon name="search" size={16} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('faq.searchPlaceholder')}
          aria-label={t('faq.searchPlaceholder')}
          className="border-line bg-panel text-ink placeholder:text-muted focus:border-accent min-h-11 w-full rounded-[var(--radius-tag)] border py-2 pr-3 pl-9 text-sm outline-none"
        />
      </div>

      <p className="text-muted mt-3 text-xs" aria-live="polite">
        {needle
          ? t('faq.matches', { count: shown.length, query: query.trim() })
          : t('faq.count', { count: items.length })}
      </p>

      {shown.length === 0 ? (
        <div className="border-line bg-panel mt-3 rounded-[var(--radius-panel)] border p-6 text-center">
          <p className="text-ink text-sm font-medium">{t('faq.noMatch', { query: query.trim() })}</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="border-line text-ink hover:border-accent mt-3 inline-flex min-h-11 items-center rounded-[8px] border px-4 py-2 text-xs"
          >
            {t('faq.clear')}
          </button>
        </div>
      ) : (
        /*
          The reference's question list: `.accordionContent > .accordionItem`, each
          one a `.accordionItemHeading` with a 24px-margin marker that rotates
          180deg while open, over a `.accordionItemContent` indented 32px. The
          heading stays a real button with `aria-expanded` (P1's contract, and what
          the reference's JS toggle does via `.selected`).
        */
        <div className="accordionContent mt-3">
          {shown.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} data-faq-item={item.id} className="accordionItem">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  aria-controls={`${item.id}-answer`}
                  className="accordionItemHeading"
                >
                  <span className="accordion-icon" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{highlight(item.q)}</span>
                </button>
                {open ? (
                  <div id={`${item.id}-answer`} className="accordionItemContent">
                    <p>{highlight(item.a)}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
