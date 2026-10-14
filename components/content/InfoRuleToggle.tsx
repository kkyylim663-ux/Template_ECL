'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * The `info-rule__btn-toggle` pattern from docs/CONTENT_REFERENCE.md: a heading
 * button that reveals the rules underneath. The rules themselves arrive already
 * rendered as children, so the markdown renderer stays on the server.
 */
export function InfoRuleToggle({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('content');
  const [open, setOpen] = useState(false);

  return (
    <section className={`border-line bg-panel rounded-[var(--radius-panel)] border ${className ?? ''}`} data-part="info-rule">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="info-rule-body"
        data-rule-toggle
        className="text-ink flex w-full items-center justify-between gap-3 px-5 py-4 text-sm font-semibold"
      >
        {label}
        <span className="text-muted flex items-center gap-2 text-[11px] font-normal">
          {open ? t('rules.hide') : t('rules.show')}
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
        </span>
      </button>

      {open ? (
        <div id="info-rule-body" className="border-line border-t px-5 py-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
