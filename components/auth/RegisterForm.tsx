'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { CallingCodePicker } from '@/components/auth/CallingCodePicker';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { useCountdown } from '@/components/auth/useCountdown';
import { useGoBack } from '@/components/auth/CardBack';
import { brand, REGION_CODES, type RegionCode } from '@/config/brand';
import { walletService, type WalletOpening } from '@/lib/api/wallet';
import { registerSchema, validate, type FieldErrors } from '@/lib/forms';
import { notifySessionChange } from '@/lib/session/useSession';

type Step = 1 | 2;

const EMPTY = {
  email: '',
  emailOtp: '',
  username: '',
  password: '',
  password2: '',
  fullName: '',
  nickname: '',
  mobile: '',
};

/** Which fields step one owns; Next blocks on this set only. */
const STEP_ONE: readonly (keyof typeof EMPTY)[] = ['email', 'emailOtp'];

/** A server answer about one field (or the whole form) after the submit. */
type RemoteError = { field: 'email' | 'emailOtp' | 'mobile' | 'form'; text: string } | null;

/**
 * The sign-up card, laid out after the reference's `signup.css`: header with the
 * step bullets, a logo slot, then the two-step form — email + verification code
 * first (with Send and the yellow warning), the profile fields second. Submitting
 * creates a mock member account, signs it in and opens the home page.
 */
export function RegisterForm({ region }: { region: string }) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [step, setStep] = useState<Step>(1);
  const [values, setValues] = useState({ ...EMPTY });
  const [callingCode, setCallingCode] = useState<RegionCode>(REGION_CODES[0]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [remoteError, setRemoteError] = useState<RemoteError>(null);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [shown, setShown] = useState({ password: false, password2: false });
  const cooldown = useCountdown();
  const [usernameTaken, setUsernameTaken] = useState(false);

  useEffect(() => {
    const name = values.username.trim();
    if (!/^[A-Za-z0-9]{4,20}$/.test(name)) {
      setUsernameTaken(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch('/api/mock-auth/check-account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: name }),
        signal: controller.signal,
      });
      if (!response.ok) return;
      const { d } = (await response.json()) as { d: { taken: boolean } };
      setUsernameTaken(d.taken);
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [values.username]);

  const firstStepReady = values.email.trim().length > 3 && values.emailOtp.trim().length === 6;
  const secondStepReady =
    values.username.trim().length >= 4 &&
    values.password.length >= 8 &&
    values.password2.length >= 8 &&
    values.fullName.trim().length >= 2 &&
    values.nickname.trim().length >= 2 &&
    values.mobile.trim().length >= 6;

  function update<K extends keyof typeof EMPTY>(field: K, value: (typeof EMPTY)[K]) {
    setRemoteError(null);
    setValues((current) => ({ ...current, [field]: value }));
  }

  function next() {
    const result = validate(registerSchema, values);

    if (!result.ok) {
      const own = Object.entries(result.errors).filter(([field]) =>
        STEP_ONE.includes(field as keyof typeof EMPTY),
      );
      if (own.length > 0) {
        setErrors(Object.fromEntries(own));
        return;
      }
    }

    setErrors({});
    setStep(2);
  }

  const goBack = useGoBack(region);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    // A second submit while the first is in flight would create a second account attempt.
    if (submitting) return;

    const result = validate(registerSchema, values);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setRemoteError(null);
    setSubmitting(true);
    const dialCode = brand.regions[callingCode].dialCode;
    const localDigits = values.mobile.replace(/\D/g, '').replace(/^0+/, '');
    const response = await fetch('/api/mock-auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: values.email.trim(),
        emailOtp: values.emailOtp.trim(),
        username: values.username.trim(),
        password: values.password,
        fullName: values.fullName.trim(),
        nickname: values.nickname.trim(),
        phone: `${dialCode}${localDigits}`,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setSubmitting(false);
      const body = (await response?.json().catch(() => null)) as { d?: { field?: string } } | null;
      const field = body?.d?.field;
      if (field === 'username') {
        setUsernameTaken(true);
        setStep(2);
      } else if (field === 'email') {
        setStep(1);
        setRemoteError({ field: 'email', text: t('register.emailTaken') });
      } else if (field === 'emailOtp') {
        setStep(1);
        setRemoteError({ field: 'emailOtp', text: t('register.codeWrong') });
      } else if (field === 'mobile') {
        setStep(2);
        setRemoteError({ field: 'mobile', text: t('register.mobileTaken') });
      } else {
        setRemoteError({ field: 'form', text: t('register.submitFailed') });
      }
      return;
    }

    // Stays disabled until the router leaves this page: the account now exists.
    const { d } = (await response.json()) as {
      d: { sub: string; walletOpening: WalletOpening };
    };
    walletService.bindAccount(d.sub, d.walletOpening);
    notifySessionChange();
    // Full navigation for the same reason as the login form (stale guest router cache).
    window.location.assign(`/${region}`);
  }

  return (
    <div className="signup-info" data-auth-card="register">
      <div className="signup-header">
        <button
          type="button"
          className="card-back"
          aria-label={t('register.back')}
          onClick={() => (step === 2 ? setStep(1) : goBack())}
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        <h1 className="card-title signup-title">{t('register.title')}</h1>
        <div className="pagination-wrapper">
          <button
            type="button"
            className={`pagination-btn${step === 1 ? ' active' : ''}`}
            aria-label={t('register.stepOne')}
            aria-current={step === 1}
            onClick={() => setStep(1)}
          />
          <button
            type="button"
            className={`pagination-btn${step === 2 ? ' active' : ''}`}
            aria-label={t('register.stepTwo')}
            aria-current={step === 2}
            onClick={() => setStep(2)}
          />
          <Link href={`/${region}`} className="close-page" aria-label={t('login.closeCard')}>
            {'×'}
          </Link>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className="signup-body">
          <span className="card-logo__mark signup-logo">{brand.name}</span>

          {step === 1 ? (
            <div className="signup-body__container step1" data-signup-step="1">
              <div className="form-group mb-0">
                <input
                  className="form-control"
                  type="email"
                  autoComplete="email"
                  placeholder={t('register.email')}
                  value={values.email}
                  onChange={(event) => update('email', event.target.value)}
                />
                <small className="form-error form-error-signup">
                  {errors.email
                    ? tc(errors.email)
                    : remoteError?.field === 'email'
                      ? remoteError.text
                      : ''}
                </small>
              </div>

              <div className="form-group mb-0">
                <input
                  className="form-control otp-input"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder={t('register.emailOtp')}
                  value={values.emailOtp}
                  onChange={(event) => update('emailOtp', event.target.value)}
                />
                <div className="password-toggle-sms">
                  <button
                    type="button"
                    className="pointer send-sms"
                    disabled={cooldown.running}
                    onClick={() => {
                      setCodeSent(true);
                      cooldown.start();
                    }}
                  >
                    {cooldown.running
                      ? t('login.otpCountdown', { s: cooldown.left })
                      : t('register.sendCode')}
                  </button>
                </div>
                <div className="form-success">{codeSent ? t('register.codeSent') : ''}</div>
                <div className="form-error">
                  {errors.emailOtp
                    ? tc(errors.emailOtp)
                    : remoteError?.field === 'emailOtp'
                      ? remoteError.text
                      : ''}
                </div>
                <div className="form-warning">{t('register.verifyHint')}</div>
              </div>

              <button
                type="button"
                className={`btn btn-primary signup-btn${firstStepReady ? '' : ' disable'}`}
                onClick={next}
              >
                {t('register.next')}
              </button>

              <div className="login-signup-tips">
                <span>{t('register.haveAccount')}</span>
                <Link className="login-signup-now" href={`/${region}/login`}>
                  {t('register.goLogin')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="signup-body__container step2" data-signup-step="2">
              <h2 className="signup-body__title">{t('register.personalDetails')}</h2>

              <div className="form-group mb-0">
                <input
                  className="form-control"
                  autoComplete="username"
                  maxLength={15}
                  placeholder={t('register.username')}
                  value={values.username}
                  onChange={(event) => update('username', event.target.value)}
                />
                <small className="form-error form-error-signup">
                  {errors.username
                    ? tc(errors.username)
                    : usernameTaken
                      ? t('register.usernameTaken')
                      : ''}
                </small>
              </div>

              <div className="form-group mb-0">
                <input
                  className="form-control"
                  type={shown.password ? 'text' : 'password'}
                  autoComplete="new-password"
                  maxLength={15}
                  placeholder={t('register.password')}
                  value={values.password}
                  onChange={(event) => update('password', event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShown((current) => ({ ...current, password: !current.password }))
                  }
                >
                  {shown.password ? t('login.hide') : t('login.show')}
                </button>
                <PasswordStrength value={values.password} />
                <small className="form-error form-error-signup">
                  {errors.password ? tc(errors.password) : ''}
                </small>
              </div>

              <div className="form-group mb-0">
                <input
                  className="form-control"
                  type={shown.password2 ? 'text' : 'password'}
                  autoComplete="new-password"
                  maxLength={15}
                  placeholder={t('register.password2')}
                  value={values.password2}
                  onChange={(event) => update('password2', event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShown((current) => ({ ...current, password2: !current.password2 }))
                  }
                >
                  {shown.password2 ? t('login.hide') : t('login.show')}
                </button>
                <small className="form-error form-error-signup">
                  {errors.password2 ? tc(errors.password2) : ''}
                </small>
              </div>

              <div className="form-group mb-0">
                <input
                  className="form-control"
                  autoComplete="name"
                  placeholder={t('register.fullName')}
                  value={values.fullName}
                  onChange={(event) => update('fullName', event.target.value)}
                />
                <small className="form-error form-error-signup-tips">
                  {errors.fullName ? tc(errors.fullName) : ''}
                </small>
                <div className="form-control__tips">{t('register.fullNameTips')}</div>
              </div>

              <div className="form-group mb-0">
                <input
                  className="form-control"
                  placeholder={t('register.nickname')}
                  value={values.nickname}
                  onChange={(event) => update('nickname', event.target.value)}
                />
                <small className="form-error form-error-signup">
                  {errors.nickname ? tc(errors.nickname) : ''}
                </small>
              </div>

              <div className="form-group mb-0">
                <div className="flex">
                  <CallingCodePicker
                    value={callingCode}
                    onChange={setCallingCode}
                    label={t('register.mobile')}
                  />
                  <input
                    className="form-control"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t('register.mobileExample')}
                    value={values.mobile}
                    onChange={(event) => update('mobile', event.target.value)}
                  />
                </div>
                <small className="form-error form-error-signup">
                  {errors.mobile
                    ? tc(errors.mobile)
                    : remoteError?.field === 'mobile'
                      ? remoteError.text
                      : ''}
                </small>
              </div>

              <button
                type="submit"
                className={`btn btn-primary signup-btn${secondStepReady ? '' : ' disable'}`}
                disabled={submitting}
              >
                {t('register.submit')}
              </button>
              {remoteError?.field === 'form' ? (
                <div className="form-error">{remoteError.text}</div>
              ) : null}

              <div className="login-signup-tips">
                <span>{t('register.haveAccount')}</span>
                <Link className="login-signup-now" href={`/${region}/login`}>
                  {t('register.goLogin')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
