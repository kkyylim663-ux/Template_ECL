'use client';

import { useTranslations } from 'next-intl';
import { useModal } from '@/components/ui/ModalProvider';

/** Opens the rules modal variant with page copy. Used by the display-only pages. */
export function RulesButton({
  title,
  body,
  label,
  className,
}: {
  title: string;
  body: string;
  label?: string;
  className?: string;
}) {
  const modal = useModal();
  const t = useTranslations('common');

  return (
    <button
      type="button"
      onClick={() => modal.rules(title, body)}
      className={`border-line text-ink hover:border-accent hover:text-accent rounded-[8px] border px-3 py-1.5 text-xs ${className ?? ''}`}
    >
      {label ?? t('rulesButton')}
    </button>
  );
}
