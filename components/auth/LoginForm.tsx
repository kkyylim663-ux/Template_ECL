'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CallingCodePicker } from '@/components/auth/CallingCodePicker';
import { CaptchaBox } from '@/components/auth/CaptchaBox';
import { useCountdown } from '@/components/auth/useCountdown';
import { REGION_CODES, type RegionCode } from '@/config/brand';
import {
  loginEmailSchema,
  loginOtpSchema,
  loginUsernameSchema,
  validate,
  type FieldErrors,
} from '@/lib/forms';
import { safeNext } from '@/lib/session/redirect';
import { SESSION_EVENT } from '@/lib/session/useSession';

type Method = 'username' | 'email' | 'sms' | 'whatsapp';

/**
 * `size` copies each reference icon's natural box (`icon-username.png` is 20×20,
 * `icon-email.png` 16×12, `icon-sms.png` 19×18, `icon-whatsapp.png` 17×18) so
 * the pill row comes out as wide as the original's.
 */
const TABS: { id: Method; labelKey: string; icon: IconName; size: number }[] = [
  { id: 'username', labelKey: 'login.tabUsername', icon: 'user', size: 20 },
  { id: 'email', labelKey: 'login.tabEmail', icon: 'mail', size: 16 },
  { id: 'sms', labelKey: 'login.tabSms', icon: 'phone', size: 19 },
  { id: 'whatsapp', labelKey: 'login.tabWhatsapp', icon: 'whatsapp', size: 17 },
];

const SCHEMAS = {
  username: loginUsernameSchema,
  email: loginEmailSchema,
  sms: loginOtpSchema,
  whatsapp: loginOtpSchema,
};

/**
 * Sign-in card body, laid out after the reference's `login.css`: a pill row of
 * the four methods (username / email / sms / whatsapp), a calling-code picker on
 * the phone tabs, and the same `.form-control` / `.login-btn` shell. Demo only:
 * values validate locally, a demo cookie is set, and the dialog says nothing was
 * sent.
 */
export function LoginForm({ next, region }: { next?: string; region: string }) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [method, setMethod] = useState<Method>('username');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [callingCode, setCallingCode] = useState<RegionCode>(REGION_CODES[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [values, setValues] = useState({ identifier: '', password: '', otp: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const cooldown = useCountdown();

  const active = TABS.find((tab) => tab.id === method) ?? TABS[0];
  const phoneMethod = method === 'sms' || method === 'whatsapp';
  const ready = phoneMethod
    ? values.identifier.trim().length >= 6 && values.otp.trim().length === 6
    : values.identifier.trim().length > 0 && values.password.length > 0;

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function pick(methodId: Method) {
    setMethod(methodId);
    setErrors({});
    setOtpSent(false);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const result = validate(SCHEMAS[method], values);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);
    const phoneMethod = method === 'sms' || method === 'whatsapp';
    const response = await fetch('/api/mock-auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: values.identifier.trim(),
        ...(phoneMethod ? { otp: values.otp.trim() } : { password: values.password }),
      }),
    });
    setSubmitting(false);

    if (!response.ok) {
      // One message for every failure, so the form never says which half was wrong.
      setFormError(t('login.failed'));
      return;
    }

    window.dispatchEvent(new Event(SESSION_EVENT));
    // A full navigation, not router.push: the client router cache can still hold
    // guest-time prefetches (a redirect to /login for every /account link) and the
    // old guest RSC of the target, so a soft push left the next member page
    // bouncing to the login form until a manual reload.
    window.location.assign(safeNext(next, `/${region}`));
  }

  return (
    <form className="login-form" onSubmit={onSubmit} noValidate>
      <div className="desktop">
        <div className="nav-tab" role="tablist" aria-label={t('login.title')}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={method === tab.id}
              className={`nav-pill${method === tab.id ? ' selected' : ''}`}
              onClick={() => pick(tab.id)}
            >
              <Icon name={tab.icon} size={tab.size} className="nav-pill__icon" />
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className={`login-select-tab${pickerOpen ? ' open' : ''}`}>
        <button
          type="button"
          className="select-pill"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
        >
          <span className="select-pill__left">
            <Icon name={active.icon} size={active.size} className="nav-pill__icon" />
            <span>{t(active.labelKey)}</span>
          </span>
          <Icon name="chevronDown" size={9} />
        </button>
        {/* T76: a plain disclosure card — role=listbox forbids the header's close
            button as a child, so the options are pressed-buttons instead. */}
        <div className="select-dropdown">
          <div className="select-dropdown__header">
            <span>{t('login.loginMode')}</span>
            <button
              type="button"
              className="select-dropdown__close"
              aria-label={t('login.closeCard')}
              onClick={() => setPickerOpen(false)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="select-dropdown__body">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={method === tab.id}
                className={`select-drown__list${method === tab.id ? ' selected' : ''}`}
                onClick={() => {
                  pick(tab.id);
                  setPickerOpen(false);
                }}
              >
                <Icon name={tab.icon} size={20} className="nav-pill__icon" />
                <span>{t(tab.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {phoneMethod ? (
        <>
          <div className="form-group flex">
            <CallingCodePicker
              value={callingCode}
              onChange={setCallingCode}
              label={t('login.identifier.mobile')}
            />
            <input
              className="form-control"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('login.identifier.mobile')}
              value={values.identifier}
              onChange={(event) => update('identifier', event.target.value)}
            />
            {errors.identifier ? (
              <div className="form-error">{tc(errors.identifier)}</div>
            ) : null}
          </div>
          <div className="form-group">
            <input
              className="form-control"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder={t('login.otp')}
              value={values.otp}
              onChange={(event) => update('otp', event.target.value)}
            />
            {errors.otp ? <div className="form-error">{tc(errors.otp)}</div> : null}
            {otpSent ? (
              <div className="form-control__tips">
                {t('login.otpHint', { target: values.identifier })}
              </div>
            ) : null}
            <button
              type="button"
              className="link-btn"
              disabled={cooldown.running || !/^\+?[0-9\s-]{6,20}$/.test(values.identifier.trim())}
              onClick={() => {
                setOtpSent(true);
                cooldown.start();
              }}
            >
              {cooldown.running
                ? t('login.otpCountdown', { s: cooldown.left })
                : t('login.sendOtp')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <input
              className="form-control"
              type={method === 'email' ? 'email' : 'text'}
              autoComplete="username"
              placeholder={
                method === 'email' ? t('login.identifier.email') : t('login.identifier.username')
              }
              value={values.identifier}
              onChange={(event) => update('identifier', event.target.value)}
            />
            {errors.identifier ? (
              <div className="form-error">{tc(errors.identifier)}</div>
            ) : null}
          </div>
          <div className="form-group mb-0">
            <input
              className="form-control"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('login.password')}
              value={values.password}
              onChange={(event) => update('password', event.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? t('login.hide') : t('login.show')}
            </button>
            {errors.password ? <div className="form-error">{tc(errors.password)}</div> : null}
          </div>
          <div className="form-group mb-0">
            <CaptchaBox />
          </div>
        </>
      )}

      <Link className="login-forget-passowrd" href={`/${region}/forgot-password`}>
        {t('login.forgot')}
      </Link>

      {formError ? (
        <div role="alert" className="form-error">
          {formError}
        </div>
      ) : null}

      <div className="login-btn__wrapper">
        <button
          type="submit"
          disabled={submitting}
          className={`btn btn-primary login-btn${ready && !submitting ? '' : ' disable'}`}
        >
          {t('login.submit')}
        </button>
      </div>

      <div className="login-signup-tips">
        <span>{t('login.noAccount')}</span>
        <Link className="login-signup-now" href={`/${region}/register`}>
          {t('login.goRegister')}
        </Link>
      </div>
    </form>
  );
}
