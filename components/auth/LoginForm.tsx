'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormNotice, PrimaryButton, TextField } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { Tabs } from '@/components/ui/Tabs';
import {
  loginEmailSchema,
  loginOtpSchema,
  loginUsernameSchema,
  validate,
  type FieldErrors,
} from '@/lib/forms';
import { DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE } from '@/lib/session';

type Method = 'username' | 'email' | 'otp';

const TAB_KEYS = [
  { id: 'username', labelKey: 'login.tabUsername' },
  { id: 'email', labelKey: 'login.tabEmail' },
  { id: 'otp', labelKey: 'login.tabOtp' },
];

const SCHEMAS = {
  username: loginUsernameSchema,
  email: loginEmailSchema,
  otp: loginOtpSchema,
};

/**
 * Sign-in form with the three methods the reference build offers. P0 is a
 * placeholder: the values are validated locally and then a demo session cookie is
 * set so the guarded member area can be browsed. No request leaves the page, and
 * the dialog says so.
 */
export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const router = useRouter();
  const modal = useModal();
  const [method, setMethod] = useState<Method>('username');
  const [values, setValues] = useState({ identifier: '', password: '', otp: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [otpSent, setOtpSent] = useState(false);

  const tabs = TAB_KEYS.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }));

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(SCHEMAS[method], values);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    // Demo session only: the real build receives an httpOnly cookie from the API.
    document.cookie = `${DEMO_SESSION_COOKIE}=${DEMO_SESSION_VALUE}; path=/; max-age=86400; samesite=lax`;
    modal.success(t('login.demoTitle'), t('login.demoBody'));
    router.refresh();
    if (next) router.push(next);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Tabs tabs={tabs} value={method} onChange={(id) => setMethod(id as Method)} label={t('login.title')} />

      {method === 'otp' ? (
        <>
          <TextField
            id="identifier"
            label={t('login.identifier.mobile')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+60 12-345 6789"
            value={values.identifier}
            error={errors.identifier ? tc(errors.identifier) : undefined}
            onChange={(event) => update('identifier', event.target.value)}
          />
          <TextField
            id="otp"
            label={t('login.otp')}
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={values.otp}
            error={errors.otp ? tc(errors.otp) : undefined}
            hint={otpSent ? t('login.otpHint', { target: values.identifier }) : undefined}
            onChange={(event) => update('otp', event.target.value)}
          />
          <button
            type="button"
            onClick={() => setOtpSent(true)}
            className="border-line text-ink hover:border-accent rounded-[8px] border px-3 py-1.5 text-xs"
          >
            {t('login.sendOtp')}
          </button>
        </>
      ) : (
        <>
          <TextField
            id="identifier"
            label={method === 'email' ? t('login.identifier.email') : t('login.identifier.username')}
            type={method === 'email' ? 'email' : 'text'}
            autoComplete="username"
            value={values.identifier}
            error={errors.identifier ? tc(errors.identifier) : undefined}
            onChange={(event) => update('identifier', event.target.value)}
          />
          <TextField
            id="password"
            label={t('login.password')}
            type="password"
            autoComplete="current-password"
            value={values.password}
            error={errors.password ? tc(errors.password) : undefined}
            onChange={(event) => update('password', event.target.value)}
          />
        </>
      )}

      <PrimaryButton type="submit" className="w-full">
        {t('login.submit')}
      </PrimaryButton>

      <FormNotice>{t('login.formNotice')}</FormNotice>
    </form>
  );
}
