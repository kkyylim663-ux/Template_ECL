'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormNotice, PrimaryButton, TextField } from '@/components/ui/Field';
import { forgotPasswordSchema, validate, type FieldErrors } from '@/lib/forms';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(forgotPasswordSchema, { email });

    if (!result.ok) {
      setErrors(result.errors);
      setSent(false);
      return;
    }

    setErrors({});
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <TextField
        id="email"
        label={t('forgot.email')}
        type="email"
        autoComplete="email"
        value={email}
        error={errors.email ? tc(errors.email) : undefined}
        onChange={(event) => setEmail(event.target.value)}
      />

      <PrimaryButton type="submit" className="w-full">
        {t('forgot.submit')}
      </PrimaryButton>

      {sent ? (
        <p className="text-sm text-[var(--color-success)]">{t('forgot.sent', { email })}</p>
      ) : null}

      <FormNotice>{t('forgot.formNotice')}</FormNotice>
    </form>
  );
}
