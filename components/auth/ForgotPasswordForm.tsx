'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { useCountdown } from '@/components/auth/useCountdown';
import {
  forgotIdentitySchema,
  forgotPasswordSchema,
  forgotResetSchema,
  validate,
  type FieldErrors,
} from '@/lib/forms';

type Step = 1 | 2 | 3;

/**
 * Three-step reset on the sign-in card: verify the account (email + code), set a
 * new password, then a done page. Going back keeps the email and code already
 * typed. Demo only: no password is changed and no request is sent.
 */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { region } = useParams<{ region: string }>();
  const cooldown = useCountdown();
  const [step, setStep] = useState<Step>(1);
  const [identity, setIdentity] = useState({ email: '', otp: '' });
  const [passwords, setPasswords] = useState({ password: '', password2: '' });
  const [shown, setShown] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function sendCode() {
    const result = validate(forgotPasswordSchema, { email: identity.email });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCodeSent(true);
    cooldown.start();
  }

  function verify(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(forgotIdentitySchema, identity);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setStep(2);
  }

  function reset(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(forgotResetSchema, passwords);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setPasswords({ password: '', password2: '' });
    setStep(3);
  }

  if (step === 3) {
    return (
      <div>
        <p className="form-success">{t('forgot.doneTitle')}</p>
        <p className="form-control__tips">{t('forgot.doneBody')}</p>
        <div className="login-btn__wrapper">
          <Link className="btn btn-primary login-btn" href={`/${region}/login`}>
            {t('forgot.toLogin')}
          </Link>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={reset} noValidate>
        <p className="form-control__tips">{t('forgot.stepLabel', { current: 2, total: 2 })}</p>
        <h2 className="form-control__tips">{t('forgot.resetTitle')}</h2>

        <div className="form-group">
          <input
            className="form-control"
            type={shown ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('forgot.newPassword')}
            value={passwords.password}
            onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
          />
          <button type="button" className="password-toggle" onClick={() => setShown((value) => !value)}>
            {shown ? t('login.hide') : t('login.show')}
          </button>
          <PasswordStrength value={passwords.password} />
          {errors.password ? <div className="form-error">{tc(errors.password)}</div> : null}
        </div>

        <div className="form-group mb-0">
          <input
            className="form-control"
            type={shown ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('forgot.confirmPassword')}
            value={passwords.password2}
            onChange={(event) => setPasswords((current) => ({ ...current, password2: event.target.value }))}
          />
          {errors.password2 ? <div className="form-error">{tc(errors.password2)}</div> : null}
        </div>

        <button type="button" className="link-btn" onClick={() => setStep(1)}>
          {t('forgot.prev')}
        </button>
        <div className="login-btn__wrapper">
          <button type="submit" className="btn btn-primary login-btn">
            {t('forgot.next')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={verify} noValidate>
      <p className="form-control__tips">{t('forgot.stepLabel', { current: 1, total: 2 })}</p>
      <h2 className="form-control__tips">{t('forgot.verifyTitle')}</h2>

      <div className="form-group">
        <input
          className="form-control"
          type="email"
          autoComplete="email"
          placeholder={t('forgot.email')}
          value={identity.email}
          onChange={(event) => setIdentity((current) => ({ ...current, email: event.target.value }))}
        />
        {errors.email ? <div className="form-error">{tc(errors.email)}</div> : null}
      </div>

      <div className="form-group mb-0">
        <input
          className="form-control"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder={t('forgot.otp')}
          value={identity.otp}
          onChange={(event) => setIdentity((current) => ({ ...current, otp: event.target.value }))}
        />
        <button type="button" className="link-btn" disabled={cooldown.running} onClick={sendCode}>
          {cooldown.running
            ? t('login.otpCountdown', { s: cooldown.left })
            : t('forgot.sendCode')}
        </button>
        {codeSent ? <div className="form-control__tips">{t('forgot.codeSent')}</div> : null}
        {errors.otp ? <div className="form-error">{tc(errors.otp)}</div> : null}
      </div>

      <div className="login-btn__wrapper">
        <button type="submit" className="btn btn-primary login-btn">
          {t('forgot.next')}
        </button>
      </div>
    </form>
  );
}
