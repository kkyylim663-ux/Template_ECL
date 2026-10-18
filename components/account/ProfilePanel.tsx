'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { regionConfig, type RegionCode } from '@/config/brand';
import { regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';
import { IconSprite } from '@/components/ui/IconSprite';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { useModal } from '@/components/ui/ModalProvider';
import { LiveBalance } from './LiveBalance';
import { changePassword, readProfileEdits, saveProfileEdits } from '@/lib/api/profile';
import { avatarSrc } from '@/lib/avatar';
import { notifySessionChange } from '@/lib/session/useSession';
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
const EMPTY_DOB = { day: '', month: '', year: '' };
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'));
const YEARS = Array.from({ length: 71 }, (_, index) => String(2010 - index));

type Dob = typeof EMPTY_DOB;
type SectionId = 'personal' | 'bank' | 'security';

/** `yyyy-mm-dd` → the three selects' values (empty when nothing was saved). */
function splitDob(iso: string | undefined): Dob {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return { ...EMPTY_DOB };
  return { year: match[1], month: match[2], day: match[3] };
}

/** The three selects → `yyyy-mm-dd`; a partial pick saves nothing. */
function joinDob(dob: Dob): string | undefined {
  return dob.day && dob.month && dob.year ? `${dob.year}-${dob.month}-${dob.day}` : undefined;
}

/**
 * The profile page body. The reference renders "myprofile" client-side (no
 * snapshot), so this follows the live member view: the centred two-pill nav
 * (My Account Information / Rebate), the account hero — greeting, avatar with
 * the tier chip, the balance row (refresh / show-hide / the deposit plus) and
 * the two-cell verify row — then three collapsible sections. Personal Details
 * keeps the T49 mock edit (nickname) plus the reference's date-of-birth selects;
 * Security keeps the mock password route and the language row.
 */
export function ProfilePanel({ profile, region }: { profile: ProfileView; region: string }) {
  const t = useTranslations('account');
  // Validation messages are keys under `common.validation.*` (see lib/forms.ts).
  const tc = useTranslations('common');
  const locale = useLocale();
  const modal = useModal();
  const currency = regionConfig(region as RegionCode).currency;
  /** Marks the panel as interactive; e2e waits for it before typing. */
  const [hydrated, setHydrated] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId | null>('personal');
  const [balanceHidden, setBalanceHidden] = useState(false);

  const emailVerified = profile.kycStatus !== 'unverified';
  const mobileVerified = profile.kycStatus === 'verified';

  const initial = useMemo(
    () => ({ nickname: profile.nickname, dob: splitDob(undefined) }),
    [profile.nickname],
  );
  const [values, setValues] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  /** The fixture plus whatever this browser saved earlier. */
  useEffect(() => {
    const edits = readProfileEdits();
    const merged = {
      nickname: edits.nickname ?? initial.nickname,
      dob: splitDob(edits.dob),
    };
    setValues(merged);
    setApplied(merged);
  }, [initial]);

  const dirty = values.nickname !== applied.nickname || values.dob !== applied.dob;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  /** Month names in the visitor's language (the selects' option labels). */
  const monthLabels = useMemo(
    () =>
      MONTHS.map((value) => ({
        value,
        label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(
          new Date(2024, Number(value) - 1, 1),
        ),
      })),
    [locale],
  );

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(profileSchema, {
      nickname: values.nickname,
      fullName: profile.fullName,
      email: profile.email,
      mobile: undefined,
      currentPassword: undefined,
      newPassword: undefined,
      confirmPassword: undefined,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    saveProfileEdits({ nickname: result.data.nickname, dob: joinDob(values.dob) });
    const saved = { nickname: result.data.nickname, dob: values.dob };
    setValues(saved);
    setApplied(saved);
    modal.success(t('profile.saved'), t('profile.mockHint'));
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(profileSchema, {
      nickname: values.nickname,
      fullName: profile.fullName,
      email: profile.email,
      mobile: undefined,
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

  const verifiedMark = (
    <>
      <Icon name="check" size={16} className="text-success" />
      <span>{t('profile.verified')}</span>
    </>
  );

  const sections: {
    id: SectionId;
    icon: 'user' | 'bankingDetails' | 'lock';
    title: string;
    body: React.ReactNode;
  }[] = [
    {
      id: 'personal',
      icon: 'user',
      title: t('profile.personalDetails'),
      body: (
        <form className="profile-form" onSubmit={saveProfile} noValidate>
          <div className="width-medium">
            <div className="form-group">
              <label>{t('profile.username')}</label>
              <p className="profile-value">{profile.username}</p>
            </div>

            <div className="form-group">
              <label>{t('profile.fullName')}</label>
              <p className="profile-value">{profile.fullName}</p>
            </div>

            <div className="form-group">
              <label>{t('profile.email')}</label>
              <p className="profile-value">
                {profile.email}
                {emailVerified ? <Icon name="check" size={16} className="text-success" /> : null}
              </p>
            </div>

            <div className="form-group">
              <label>{t('profile.mobile')}</label>
              <p className="profile-value">
                {profile.mobileMasked}
                {mobileVerified ? (
                  <Icon name="check" size={16} className="text-success" />
                ) : (
                  <button
                    type="button"
                    className="profile-inline-action"
                    onClick={() => setOpenSection('security')}
                  >
                    {t('profile.verify')}
                  </button>
                )}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="profile-nickname">{t('profile.nickname')}</label>
              <input
                id="profile-nickname"
                className="form-control"
                value={values.nickname}
                onChange={(event) =>
                  setValues((previous) => ({ ...previous, nickname: event.target.value }))
                }
              />
              <div className="form-error" role="alert">
                {errors.nickname ? tc(errors.nickname) : null}
              </div>
            </div>

            <div className="form-group">
              <label>{t('profile.dob')}</label>
              <div className="profile-dob">
                <select
                  aria-label={t('profile.day')}
                  value={values.dob.day}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      dob: { ...previous.dob, day: event.target.value },
                    }))
                  }
                >
                  <option value="">{t('profile.day')}</option>
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t('profile.month')}
                  value={values.dob.month}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      dob: { ...previous.dob, month: event.target.value },
                    }))
                  }
                >
                  <option value="">{t('profile.month')}</option>
                  {monthLabels.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t('profile.year')}
                  value={values.dob.year}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      dob: { ...previous.dob, year: event.target.value },
                    }))
                  }
                >
                  <option value="">{t('profile.year')}</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="profile-submit-row">
            <button className="profile-submit" type="submit">
              {t('profile.submit')}
            </button>
          </div>
        </form>
      ),
    },
    {
      id: 'bank',
      icon: 'bankingDetails',
      title: t('profile.bankDetails'),
      body: (
        <div className="profile-bank">
          <p className="profile-hint">{t('profile.bankHint')}</p>
          <Link className="btn btn-primary" href={regionPath(region, '/account/banks')}>
            {t('profile.manageBanks')}
          </Link>
        </div>
      ),
    },
    {
      id: 'security',
      icon: 'lock',
      title: t('profile.security'),
      body: (
        <div>
          <form className="profile-form" onSubmit={savePassword} noValidate>
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
                    setPasswords((previous) => ({
                      ...previous,
                      currentPassword: event.target.value,
                    }))
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
                    setPasswords((previous) => ({
                      ...previous,
                      confirmPassword: event.target.value,
                    }))
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
          </form>

          <section className="has-space profile-language">
            <h2 className="profile-section-title">{t('profile.language')}</h2>
            <LanguageSwitcher variant="inline" />
          </section>
        </div>
      ),
    },
  ];

  return (
    <div data-profile-hydrated={hydrated ? 'true' : 'false'}>
      {/* Icons outside the shell sprite ride with this panel (T26). */}
      <IconSprite only={['plus', 'eye', 'eyeOff', 'refresh', 'lock']} />
      {/* The reference's own mobile nav: `mobile-profile__nav` + `.nav-pill2`. */}
      <nav className="mobile-profile__nav" aria-label={t('profile.tabsLabel')}>
        {/* aria-current, not aria-selected: these are links, and axe rejects
            aria-selected on the link role (T76 sweep, member routes). */}
        <span className="pill-tab" aria-current="page">
          {t('profile.tabs.info')}
        </span>
        <Link className="pill-tab" href={regionPath(region, '/account/rebates')}>
          {t('profile.tabs.rebate')}
        </Link>
      </nav>

      <section className="profile-hero">
        <p className="profile-hero__hello">
          {t('profile.greeting', { username: profile.username })}
        </p>

        <div className="profile-hero__identity">
          <span className="profile-hero__avatar" aria-hidden>
            <img
              src={avatarSrc(profile.username)}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          </span>
          <Link href={regionPath(region, '/vip')} className="profile-hero__tier">
            <Icon name="trophy" size={15} />
            <span>{profile.vipTier}</span>
            <Icon name="chevronRight" size={14} />
          </Link>
        </div>

        <div className="profile-hero__balance">
          <span className="profile-hero__currency">{currency}</span>
          <span className="profile-hero__amount">
            {balanceHidden ? '••••••' : <LiveBalance field="total" />}
          </span>
          <button
            type="button"
            className="profile-hero__icon-btn"
            aria-label={t('profile.refresh')}
            onClick={() => notifySessionChange()}
          >
            <Icon name="refresh" size={16} />
          </button>
          <button
            type="button"
            className="profile-hero__icon-btn"
            aria-label={balanceHidden ? t('profile.showBalance') : t('profile.hideBalance')}
            aria-pressed={balanceHidden}
            onClick={() => setBalanceHidden((previous) => !previous)}
          >
            <Icon name={balanceHidden ? 'eyeOff' : 'eye'} size={18} />
          </button>
          <Link
            href={regionPath(region, '/account/deposit')}
            className="profile-hero__plus"
            aria-label={t('profile.depositAction')}
          >
            <Icon name="plus" size={18} />
          </Link>
        </div>

        <div className="profile-hero__verify">
          <span className="profile-verify">
            <Icon name="mail" size={20} />
            {emailVerified ? verifiedMark : <span>{t('profile.verify')}</span>}
          </span>
          <button type="button" className="profile-verify" onClick={() => setOpenSection('security')}>
            <Icon name="phone" size={20} />
            {mobileVerified ? (
              verifiedMark
            ) : (
              <span>
                {t('profile.verify')}
                <span className="profile-verify__x" aria-hidden="true">
                  ✕
                </span>
              </span>
            )}
          </button>
        </div>
      </section>

      {sections.map((section) => {
        const open = openSection === section.id;
        return (
          <div key={section.id} className="accordionItem">
            <button
              type="button"
              className="accordionItemHeading"
              aria-expanded={open}
              onClick={() => setOpenSection(open ? null : section.id)}
            >
              <Icon name={section.icon} size={20} className="text-muted me-4 shrink-0" />
              <span>{section.title}</span>
              <Icon name="chevronDown" size={16} className="accordion-icon text-muted ms-auto" />
            </button>
            <div className={`accordionItemContent${open ? ' selected' : ''}`}>{section.body}</div>
          </div>
        );
      })}
    </div>
  );
}
