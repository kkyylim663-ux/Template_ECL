'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormNotice, PrimaryButton, TextField } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { registerSchema, validate, type FieldErrors } from '@/lib/forms';

const EMPTY = {
  email: '',
  emailOtp: '',
  username: '',
  password: '',
  password2: '',
  fullName: '',
  nickname: '',
  mobile: '',
  upline: '',
  acceptedTerms: false,
};

/** Registration form: full field set, zod validation, no request of any kind. */
export function RegisterForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const modal = useModal();
  const [values, setValues] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [codeSent, setCodeSent] = useState(false);

  function update<K extends keyof typeof EMPTY>(field: K, value: (typeof EMPTY)[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(registerSchema, values);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    modal.success(t('register.demoTitle'), t('register.demoBody'));
    setValues({ ...EMPTY });
    setCodeSent(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 desktop:grid-cols-2">
        <TextField
          id="email"
          label={t('register.email')}
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email ? tc(errors.email) : undefined}
          onChange={(event) => update('email', event.target.value)}
        />
        <div>
          <TextField
            id="emailOtp"
            label={t('register.emailOtp')}
            inputMode="numeric"
            maxLength={6}
            value={values.emailOtp}
            error={errors.emailOtp ? tc(errors.emailOtp) : undefined}
            hint={codeSent ? t('register.demoCode') : undefined}
            onChange={(event) => update('emailOtp', event.target.value)}
          />
          <button
            type="button"
            onClick={() => setCodeSent(true)}
            className="border-line text-ink hover:border-accent mt-2 rounded-[8px] border px-3 py-1.5 text-xs"
          >
            {t('register.sendCode')}
          </button>
        </div>

        <TextField
          id="username"
          label={t('register.username')}
          autoComplete="username"
          value={values.username}
          error={errors.username ? tc(errors.username) : undefined}
          hint={tc('validation.usernameFormat')}
          onChange={(event) => update('username', event.target.value)}
        />
        <TextField
          id="mobile"
          label={t('register.mobile')}
          type="tel"
          inputMode="tel"
          value={values.mobile}
          error={errors.mobile ? tc(errors.mobile) : undefined}
          onChange={(event) => update('mobile', event.target.value)}
        />

        <TextField
          id="password"
          label={t('register.password')}
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password ? tc(errors.password) : undefined}
          hint={tc('validation.passwordShort')}
          onChange={(event) => update('password', event.target.value)}
        />
        <TextField
          id="password2"
          label={t('register.password2')}
          type="password"
          autoComplete="new-password"
          value={values.password2}
          error={errors.password2 ? tc(errors.password2) : undefined}
          onChange={(event) => update('password2', event.target.value)}
        />

        <TextField
          id="fullName"
          label={t('register.fullName')}
          value={values.fullName}
          error={errors.fullName ? tc(errors.fullName) : undefined}
          onChange={(event) => update('fullName', event.target.value)}
        />
        <TextField
          id="nickname"
          label={t('register.nickname')}
          value={values.nickname}
          error={errors.nickname ? tc(errors.nickname) : undefined}
          onChange={(event) => update('nickname', event.target.value)}
        />

        <TextField
          id="upline"
          label={t('register.upline')}
          value={values.upline}
          error={errors.upline ? tc(errors.upline) : undefined}
          onChange={(event) => update('upline', event.target.value)}
        />
      </div>

      <label className="text-muted flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={values.acceptedTerms}
          onChange={(event) => update('acceptedTerms', event.target.checked)}
          className="accent-accent mt-0.5"
        />
        <span>
          {t('register.acceptTerms')}
          {errors.acceptedTerms ? (
            <span role="alert" className="mt-1 block text-11 text-[var(--color-danger)]">
              {tc(errors.acceptedTerms)}
            </span>
          ) : null}
        </span>
      </label>

      <PrimaryButton type="submit" className="w-full">
        {t('register.submit')}
      </PrimaryButton>

      <FormNotice>{t('register.formNotice')}</FormNotice>
    </form>
  );
}
