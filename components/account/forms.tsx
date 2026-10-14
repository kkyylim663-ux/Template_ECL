'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormNotice, PrimaryButton, SelectField, TextField } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { Tabs } from '@/components/ui/Tabs';
import {
  depositSchema,
  profileSchema,
  transferSchema,
  validate,
  withdrawalSchema,
  type FieldErrors,
} from '@/lib/forms';
import type { AccountPayload } from '@/lib/api/schemas';

const amount = (value: string) => Number(value.replace(/[^0-9.]/g, ''));

function useDemoSubmit() {
  const modal = useModal();
  return (title: string, body: string) => modal.success(title, body);
}

export function DepositForm({ payload }: { payload: AccountPayload }) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const notify = useDemoSubmit();
  const [method, setMethod] = useState<'bank' | 'gateway'>('bank');
  const [values, setValues] = useState({
    amount: '',
    bankId: payload.banks[0]?.id ?? '',
    channelId: payload.channels[0]?.id ?? '',
    senderName: '',
    senderAccount: '',
    bankReference: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [receipt, setReceipt] = useState('');

  const bank = payload.banks.find((entry) => entry.id === values.bankId);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(depositSchema, {
      method,
      amount: amount(values.amount),
      bankId: values.bankId,
      channelId: values.channelId,
      senderName: values.senderName,
      senderAccount: values.senderAccount,
      bankReference: values.bankReference,
    });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    notify(t('deposit.demoTitle'), t('deposit.demoBody'));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Tabs
        tabs={[
          { id: 'bank', label: t('deposit.methodBank') },
          { id: 'gateway', label: t('deposit.methodGateway') },
        ]}
        value={method}
        onChange={(id) => setMethod(id as 'bank' | 'gateway')}
        label={t('deposit.methodLabel')}
      />

      {method === 'bank' ? (
        <>
          <div className="border-line bg-panel-soft rounded-[var(--radius-panel)] border p-4">
            <p className="text-muted text-[11px] tracking-widest uppercase">{t('deposit.bankingDetails')}</p>
            <SelectField
              id="bankId"
              label={t('deposit.bankSelector')}
              value={values.bankId}
              onChange={(event) => setValues((c) => ({ ...c, bankId: event.target.value }))}
              options={payload.banks.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
            {bank ? (
              <dl className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t('deposit.accountName')}</dt>
                  <dd className="text-ink">{bank.accountName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t('deposit.accountNumber')}</dt>
                  <dd className="text-ink font-mono">{bank.accountNumber}</dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="grid gap-4 desktop:grid-cols-2">
            <TextField
              id="senderName"
              label={t('deposit.senderName')}
              value={values.senderName}
              onChange={(event) => setValues((c) => ({ ...c, senderName: event.target.value }))}
            />
            <TextField
              id="senderAccount"
              label={t('deposit.senderAccount')}
              value={values.senderAccount}
              onChange={(event) => setValues((c) => ({ ...c, senderAccount: event.target.value }))}
            />
            <TextField
              id="bankReference"
              label={t('deposit.bankReference')}
              value={values.bankReference}
              onChange={(event) => setValues((c) => ({ ...c, bankReference: event.target.value }))}
            />
            <div>
              <label htmlFor="receipt" className="text-muted block text-xs font-medium">
                {t('deposit.receipt')}
              </label>
              <input
                id="receipt"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => setReceipt(event.target.files?.[0]?.name ?? '')}
                className="border-line bg-panel text-muted mt-1.5 w-full rounded-[var(--radius-tag)] border px-3 py-2 text-xs"
              />
              <p className="text-muted mt-1 text-[11px]">
                {receipt ? t('deposit.receiptSelected', { name: receipt }) : t('deposit.receiptHint')}
              </p>
            </div>
          </div>
        </>
      ) : (
        <SelectField
          id="channelId"
          label={t('deposit.channel')}
          value={values.channelId}
          onChange={(event) => setValues((c) => ({ ...c, channelId: event.target.value }))}
          options={payload.channels.map((channel) => ({
            value: channel.id,
            label: t('deposit.channelOption', { name: channel.name, fee: channel.feePct }),
          }))}
        />
      )}

      <TextField
        id="amount"
        label={t('deposit.amount')}
        inputMode="decimal"
        placeholder="100.00"
        value={values.amount}
        error={errors.amount ? tc(errors.amount) : undefined}
        onChange={(event) => setValues((c) => ({ ...c, amount: event.target.value }))}
      />

      <PrimaryButton type="submit">{t('deposit.submit')}</PrimaryButton>

      <FormNotice>{t('deposit.pendingNotice')}</FormNotice>
    </form>
  );
}

export function WithdrawalForm({ payload }: { payload: AccountPayload }) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const notify = useDemoSubmit();
  const verified = payload.bankAccounts.filter((account) => account.verified);
  const [values, setValues] = useState({
    bankAccountId: verified[0]?.id ?? '',
    amount: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validate(withdrawalSchema, {
      bankAccountId: values.bankAccountId,
      amount: amount(values.amount),
    });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    notify(t('withdrawal.demoTitle'), t('withdrawal.demoBody'));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {verified.length === 0 ? (
        <FormNotice>{t('withdrawal.noBankAccount')}</FormNotice>
      ) : null}

      <SelectField
        id="bankAccountId"
        label={t('withdrawal.bankAccount')}
        value={values.bankAccountId}
        error={errors.bankAccountId ? tc(errors.bankAccountId) : undefined}
        onChange={(event) => setValues((c) => ({ ...c, bankAccountId: event.target.value }))}
        options={payload.bankAccounts.map((account) => ({
          value: account.id,
          label: t('withdrawal.optionLabel', {
            bank: account.bankId.toUpperCase(),
            number: account.accountNumberMasked,
            state: account.verified
              ? t('withdrawal.optionVerified')
              : t('withdrawal.optionUnverified'),
          }),
          disabled: !account.verified,
        }))}
      />

      <TextField
        id="amount"
        label={t('withdrawal.amount')}
        inputMode="decimal"
        placeholder="100.00"
        value={values.amount}
        error={errors.amount}
        hint={t('withdrawal.limits', { min: 'RM 50', max: 'RM 5,000' })}
        onChange={(event) => setValues((c) => ({ ...c, amount: event.target.value }))}
      />

      <PrimaryButton type="submit">{t('withdrawal.submit')}</PrimaryButton>

      <FormNotice>{t('withdrawal.placeholderNotice')}</FormNotice>
    </form>
  );
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
