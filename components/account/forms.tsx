'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormNotice, PrimaryButton, SelectField, TextField } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { profileSchema, transferSchema, validate, type FieldErrors } from '@/lib/forms';
import type { AccountPayload } from '@/lib/api/schemas';

const amount = (value: string) => Number(value.replace(/[^0-9.]/g, ''));

function useDemoSubmit() {
  const modal = useModal();
  return (title: string, body: string) => modal.success(title, body);
}

export function TransferForm({ payload }: { payload: AccountPayload }) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const notify = useDemoSubmit();
  const options = payload.wallets.map((wallet) => ({
    value: wallet.code,
    label: wallet.available ? wallet.name : `${wallet.name} · ${t('walletOffline')}`,
    disabled: !wallet.available,
  }));
  const [values, setValues] = useState({
    fromCode: payload.wallets[0]?.code ?? '',
    toCode: payload.wallets[1]?.code ?? '',
    amount: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(transferSchema, {
      fromCode: values.fromCode,
      toCode: values.toCode,
      amount: amount(values.amount),
    });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    notify(t('transfer.demoTitle'), t('transfer.demoBody'));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 desktop:grid-cols-2">
        <SelectField
          id="fromCode"
          label={t('transfer.from')}
          value={values.fromCode}
          error={errors.fromCode ? tc(errors.fromCode) : undefined}
          onChange={(event) => setValues((c) => ({ ...c, fromCode: event.target.value }))}
          options={options}
        />
        <SelectField
          id="toCode"
          label={t('transfer.to')}
          value={values.toCode}
          error={errors.toCode ? tc(errors.toCode) : undefined}
          onChange={(event) => setValues((c) => ({ ...c, toCode: event.target.value }))}
          options={options}
        />
      </div>

      <TextField
        id="amount"
        label={t('transfer.amount')}
        inputMode="decimal"
        placeholder="50.00"
        value={values.amount}
        error={errors.amount}
        onChange={(event) => setValues((c) => ({ ...c, amount: event.target.value }))}
      />

      <label className="text-muted flex items-center gap-2 text-xs">
        <input type="checkbox" defaultChecked={payload.autoTransfer} className="accent-accent" />
        {t('transfer.auto')}
      </label>

      <PrimaryButton type="submit">{t('transfer.submit')}</PrimaryButton>

      <FormNotice>{t('transfer.placeholderNotice')}</FormNotice>
    </form>
  );
}

export function ProfileForm({ payload }: { payload: AccountPayload }) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const notify = useDemoSubmit();
  const [values, setValues] = useState({
    nickname: payload.profile.nickname,
    fullName: payload.profile.fullName,
    mobile: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const profileResult = validate(profileSchema, {
      nickname: values.nickname,
      fullName: values.fullName,
      mobile: values.mobile || undefined,
      currentPassword: values.currentPassword || undefined,
      newPassword: values.newPassword || undefined,
      confirmPassword: values.confirmPassword || undefined,
    });

    if (!profileResult.ok) {
      setErrors(profileResult.errors);
      return;
    }

    setErrors({});
    notify(t('profile.demoTitle'), t('profile.demoBody'));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 desktop:grid-cols-2">
        <TextField
          id="username"
          label={t('profile.username')}
          value={payload.profile.username}
          readOnly
          disabled
          hint={t('profile.usernameHint')}
        />
        <TextField
          id="nickname"
          label={t('profile.nickname')}
          value={values.nickname}
          error={errors.nickname ? tc(errors.nickname) : undefined}
          onChange={(event) => setValues((c) => ({ ...c, nickname: event.target.value }))}
        />
        <TextField
          id="fullName"
          label={t('profile.fullName')}
          value={values.fullName}
          error={errors.fullName ? tc(errors.fullName) : undefined}
          onChange={(event) => setValues((c) => ({ ...c, fullName: event.target.value }))}
        />
        <TextField
          id="email"
          label={t('profile.email')}
          value={payload.profile.email}
          readOnly
          disabled
          hint={t('profile.emailHint')}
        />
        <TextField
          id="mobile"
          label={t('profile.mobile')}
          value={values.mobile}
          error={errors.mobile ? tc(errors.mobile) : undefined}
          placeholder={payload.profile.mobileMasked}
          onChange={(event) => setValues((c) => ({ ...c, mobile: event.target.value }))}
        />
      </div>

      <h3 className="text-ink pt-2 text-sm font-semibold">{t('profile.passwordTitle')}</h3>
      <div className="grid gap-4 desktop:grid-cols-3">
        <TextField
          id="currentPassword"
          label={t('profile.currentPassword')}
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          error={errors.currentPassword ? tc(errors.currentPassword) : undefined}
          onChange={(event) => setValues((c) => ({ ...c, currentPassword: event.target.value }))}
        />
        <TextField
          id="newPassword"
          label={t('profile.newPassword')}
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          error={errors.newPassword ? tc(errors.newPassword) : undefined}
          onChange={(event) => setValues((c) => ({ ...c, newPassword: event.target.value }))}
        />
        <TextField
          id="confirmPassword"
          label={t('profile.confirmPassword')}
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          error={errors.confirmPassword ? tc(errors.confirmPassword) : undefined}
          onChange={(event) => setValues((c) => ({ ...c, confirmPassword: event.target.value }))}
        />
      </div>

      <PrimaryButton type="submit">{t('profile.save')}</PrimaryButton>
      <FormNotice>{t('profile.placeholderNotice')}</FormNotice>
    </form>
  );
}
