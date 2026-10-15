'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { forgotPasswordSchema, validate, type FieldErrors } from '@/lib/forms';

/**
 * Reset form on the same `.card` shell as sign-in: one email field and the
 * `.login-btn`. Demo only — nothing is sent, and the confirmation says so.
 */
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
    <form onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <input
          className="form-control"
          type="email"
          autoComplete="email"
          placeholder={t('forgot.email')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {errors.email ? <div className="form-error">{tc(errors.email)}</div> : null}
      </div>

      <div className="login-btn__wrapper">
        <button type="submit" className="btn btn-primary login-btn">
          {t('forgot.submit')}
        </button>
      </div>

      {sent ? <p className="form-success">{t('forgot.sent', { email })}</p> : null}
    </form>
  );
}
