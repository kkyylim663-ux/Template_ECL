'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { useModal } from '@/components/ui/ModalProvider';
import { changePassword, readProfileEdits, saveProfileEdits } from '@/lib/api/profile';
import { profileSchema, validate, type FieldErrors } from '@/lib/forms';

export interface ProfileView {
  username: string;
  nickname: string;
  fullName: string;
  email: string;
  mobileMasked: string;
  vipTier: string;
  kycStatus: 'unverified' | 'pending' | 'verified';
  joinedAt: string;
}

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * The profile page body (T49). "Profile" is a client-side view on the original —
 * no URL and no snapshot — so this keeps the build's own form inside the
 * reference's account card. Edits (nickname / email / mobile) are mock-only and
 * stored per browser; the password block posts to the mock auth route, where the
 * new password is what a later sign-in accepts; the language row writes the same
 * cookie the shell's switcher uses. A dirty form warns before the page unloads.
 */
export function ProfilePanel({ profile }: { profile: ProfileView }) {
  const t = useTranslations('account');
  // Validation messages are keys under `common.validation.*` (see lib/forms.ts).
  const tc = useTranslations('common');
  const modal = useModal();

  const initial = useMemo(
    () => ({ nickname: profile.nickname, email: profile.email, mobile: '' }),
    [profile],
  );
  const [values, setValues] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  /** Marks the panel as interactive; e2e waits for it before typing. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  /** The fixture plus whatever this browser saved earlier. */
  useEffect(() => {
    const edits = readProfileEdits();
    const merged = {
      nickname: edits.nickname ?? initial.nickname,
      email: edits.email ?? initial.email,
      mobile: edits.mobile ?? '',
    };
    setValues(merged);
    setApplied(merged);
  }, [initial]);

  const dirty =
    values.nickname !== applied.nickname ||
    values.email !== applied.email ||
    values.mobile !== applied.mobile;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(profileSchema, {
      ...values,
      fullName: profile.fullName,
      currentPassword: undefined,
      newPassword: undefined,
      confirmPassword: undefined,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    saveProfileEdits({
      nickname: result.data.nickname,
      email: result.data.email,
      mobile: result.data.mobile,
    });
    const saved = {
      nickname: result.data.nickname,
      email: result.data.email,
      mobile: result.data.mobile ?? '',
    };
    setValues(saved);
    setApplied(saved);
    modal.success(t('profile.saved'), t('profile.mockHint'));
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(profileSchema, {
      nickname: values.nickname,
      fullName: profile.fullName,
      email: values.email,
      mobile: values.mobile || undefined,
      ...passwords,
    });
    if (!result.ok) {
      setPasswordErrors(result.errors);
      return;
    }
    setPasswordErrors({});
    setBusy(true);
    const ok = await changePassword({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword ?? '',
    });
    setBusy(false);
    if (!ok) {
      modal.error(t('profile.passwordTitle'), t('profile.wrongPassword'));
      return;
    }
    setPasswords(EMPTY_PASSWORDS);
    modal.success(t('profile.passwordSaved'), t('profile.mockHint'));
  }

  return (
    <>
      <dl className="profile-facts has-space" data-profile-hydrated={hydrated ? 'true' : 'false'}>
        <div className="profile-fact">
          <dt>{t('profile.username')}</dt>
          <dd>{profile.username}</dd>
        </div>
        <div className="profile-fact">
          <dt>{t('profile.vipTier')}</dt>
          <dd>{profile.vipTier}</dd>
        </div>
        <div className="profile-fact">
          <dt>{t('profile.kycLabel')}</dt>
          <dd>{t(`profile.kyc.${profile.kycStatus}`)}</dd>
        </div>
        <div className="profile-fact">
          <dt>{t('profile.joined')}</dt>
          <dd>{profile.joinedAt.slice(0, 10)}</dd>
        </div>
      </dl>

      <form className="has-space profile-form" onSubmit={saveProfile} noValidate>
        <div className="width-medium">
          <div className="form-group">
            <label htmlFor="profile-nickname">{t('profile.nickname')}</label>
            <input
              id="profile-nickname"
              className="form-control"
              value={values.nickname}
              onChange={(event) => setValues((previous) => ({ ...previous, nickname: event.target.value }))}
            />
            <div className="form-error" role="alert">
              {errors.nickname ? tc(errors.nickname) : null}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="profile-email">{t('profile.email')}</label>
            <input
              id="profile-email"
              className="form-control"
              type="email"
              value={values.email}
              onChange={(event) => setValues((previous) => ({ ...previous, email: event.target.value }))}
            />
            <div className="form-error" role="alert">
              {errors.email ? tc(errors.email) : null}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="profile-mobile">{t('profile.mobile')}</label>
            <input
              id="profile-mobile"
              className="form-control"
              inputMode="tel"
              placeholder={profile.mobileMasked}
              value={values.mobile}
              onChange={(event) => setValues((previous) => ({ ...previous, mobile: event.target.value }))}
            />
            <div className="form-error" role="alert">
              {errors.mobile ? tc(errors.mobile) : null}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" type="submit">
          {t('profile.save')}
        </button>
      </form>

      <form className="has-space profile-form" onSubmit={savePassword} noValidate>
        <h2 className="profile-section-title">{t('profile.passwordTitle')}</h2>
        <div className="width-medium">
          <div className="form-group">
            <label htmlFor="profile-current">{t('profile.currentPassword')}</label>
            <input
              id="profile-current"
              className="form-control"
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(event) =>
                setPasswords((previous) => ({ ...previous, currentPassword: event.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-new">{t('profile.newPassword')}</label>
            <input
              id="profile-new"
              className="form-control"
              type="password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(event) =>
                setPasswords((previous) => ({ ...previous, newPassword: event.target.value }))
              }
            />
            <PasswordStrength value={passwords.newPassword} />
          </div>

          <div className="form-group">
            <label htmlFor="profile-confirm">{t('profile.confirmPassword')}</label>
            <input
              id="profile-confirm"
              className="form-control"
              type="password"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={(event) =>
                setPasswords((previous) => ({ ...previous, confirmPassword: event.target.value }))
              }
            />
            <div className="form-error" role="alert">
              {passwordErrors.newPassword ? tc(passwordErrors.newPassword) : null}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {t('profile.passwordTitle')}
        </button>
        <p className="profile-hint">{t('profile.usernameHint')}</p>
      </form>

      <section className="has-space profile-language">
        <h2 className="profile-section-title">{t('profile.language')}</h2>
        <LanguageSwitcher variant="inline" />
      </section>
    </>
  );
}
