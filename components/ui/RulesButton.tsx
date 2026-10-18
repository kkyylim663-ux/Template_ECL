'use client';

import { useTranslations } from 'next-intl';
import { useModal } from '@/components/ui/ModalProvider';

/** Opens the rules modal variant with page copy. Used by the display-only pages. */
export function RulesButton({
  title,
  body,
  label,
  className,
  image,
}: {
  title: string;
  body: string;
  label?: string;
  className?: string;
  /** When present the modal shows the rules infographic instead of the copy. */
  image?: { desktop: string; mobile: string };
}) {
  const modal = useModal();
  const t = useTranslations('common');

  return (
    <button
      type="button"
      onClick={() => modal.rules(title, body, image)}
      className={`border-line text-ink hover:border-accent hover:text-accent rounded-[8px] border px-3 py-1.5 text-xs ${className ?? ''}`}
    >
      {label ?? t('rulesButton')}
    </button>
  );
}
