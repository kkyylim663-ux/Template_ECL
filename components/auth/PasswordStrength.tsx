'use client';

import { useTranslations } from 'next-intl';

const LABEL_KEYS = ['passwordStrength.weak', 'passwordStrength.medium', 'passwordStrength.strong'] as const;
const BAR_CLASS = [
  'bg-[var(--color-danger)]',
  'bg-[var(--color-gold)]',
  'bg-[var(--color-accent)]',
] as const;

/** 0 for an empty value, otherwise 1 (weak) to 3 (strong): length plus character classes. */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 {
  if (value.length === 0) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) => rule.test(value)).length;
  const score = (value.length >= 8 ? 1 : 0) + (classes >= 2 ? 1 : 0) + (classes >= 3 ? 1 : 0);
  return Math.max(1, score) as 1 | 2 | 3;
}

/** Three-segment meter under a new-password field; empty until something is typed. */
export function PasswordStrength({ value }: { value: string }) {
  const t = useTranslations('auth');
  const level = passwordStrength(value);

  if (level === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1 flex-1 rounded-full ${
              segment <= level ? BAR_CLASS[level - 1] : 'bg-[var(--color-line-strong)]'
            }`}
          />
        ))}
      </div>
      <p className="form-control__tips" data-strength={level}>
        {t('passwordStrength.label')}: {t(LABEL_KEYS[level - 1])}
      </p>
    </div>
  );
}
