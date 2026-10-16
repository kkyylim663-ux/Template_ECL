'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useModal } from '@/components/ui/ModalProvider';
import { useToast } from '@/components/ui/Toast';
import { PrimaryButton, SelectField, TextField } from '@/components/ui/Field';
import { bankAccountFormSchema, validate, type FieldErrors } from '@/lib/forms';
import {
  withdrawalInfoSchema,
  type BoundBankAccount,
  type WithdrawalInfo,
} from '@/lib/api/schemas';
import {
  MAX_BOUND_ACCOUNTS,
  maskAccountNumber,
  normalizeAccountNumber,
} from '@/lib/withdrawal-flow';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';
type FormMode = { kind: 'add' } | { kind: 'edit'; id: string };

/** What every mutation route answers; anything else is the failure dialog. */
type Envelope = { status?: string; d?: unknown };

/**
 * Banking Details (`/account/banks`) — the reference's own member page for bound
 * bank accounts (`/my/mybanks`, labelled "Banking Details" in its menu and its
 * dictionary, icon `icon-banking-details.svg`). Its chunk was never captured, so
 * the table follows the resource's own column keys (`bank` / `account-number` /
 * `status` / `action`) and the stylesheet's banking classes (`.mybank-wrapper`,
 * `.bank-table__acc`, `.my-bank__verfied`, `.my-bank-action`,
 * `.mybank-verify-now`); the add form follows the old build's contract
 * (`#baBankId` + `#baNo`, whose validation and success strings the dictionary
 * carries) plus the new resource's `account-name`. Edit / set-default / the cap
 * of three are this build's rules — the reference documents none of them — and
 * its `confirm_delete` question is what the delete dialog asks. Accounts come
 * from the same store the withdrawal page reads, so both stay in step.
 */
export function BankingDetailsPanel() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const modal = useModal();
  const toast = useToast();
  const [state, setState] = useState<LoadState>('loading');
  const [info, setInfo] = useState<WithdrawalInfo | null>(null);
  const [mode, setMode] = useState<FormMode>({ kind: 'add' });
  const [bankId, setBankId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchInfo = useCallback(async () => {
    const response = await fetch('/api/withdrawal/info', { cache: 'no-store' });
    const payload = (await response.json()) as Envelope;
    if (payload?.status !== '0') throw new Error(payload?.status ?? `HTTP ${response.status}`);
    return withdrawalInfoSchema.parse(payload.d);
  }, []);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const data = await fetchInfo();
      setInfo(data);
      setState(data.bankAccounts.length === 0 ? 'empty' : 'ready');
    } catch {
      setState('error');
    }
  }, [fetchInfo]);

  /** After a mutation the list is re-read without dropping back to `loading`. */
  const refresh = useCallback(async () => {
    const data = await fetchInfo();
    setInfo(data);
    setState(data.bankAccounts.length === 0 ? 'empty' : 'ready');
  }, [fetchInfo]);

  useEffect(() => {
    void load();
  }, [load]);

  const accounts = info?.bankAccounts ?? [];
  const atLimit = accounts.length >= MAX_BOUND_ACCOUNTS;
  const bankName = (id: string) => info?.banks.find((bank) => bank.id === id)?.name ?? id;

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function resetForm() {
    setMode({ kind: 'add' });
    setBankId('');
    setAccountName('');
    setAccountNumber('');
    setErrors({});
  }

  function startEdit(account: BoundBankAccount) {
    setMode({ kind: 'edit', id: account.id });
    setBankId(account.bankId);
    setAccountName(account.accountName);
    setAccountNumber(normalizeAccountNumber(account.accountNumber));
    setErrors({});
  }

  /** The store's own refusals answer with the reference's codes (205 / our cap). */
  function reportFailure(status: string | undefined) {
    if (status === '205') {
      modal.error(tc('modal.error'), t('bankingDetails.duplicate'));
    } else if (status === '207') {
      modal.error(tc('modal.error'), t('bankingDetails.limitReached'));
    } else {
      modal.error(tc('modal.error'), t('wallet.network'));
    }
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    const editing = mode.kind === 'edit';
    if (submitting || (atLimit && !editing)) return;

    const result = validate(bankAccountFormSchema, {
      bankId,
      accountName,
      accountNumber: normalizeAccountNumber(accountNumber),
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch(
        editing ? `/api/withdrawal/banks/${mode.id}` : '/api/withdrawal/banks',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(result.data),
        },
      );
      const payload = (await response.json()) as Envelope;
      if (payload?.status !== '0') {
        reportFailure(payload?.status);
        return;
      }
      resetForm();
      await refresh().catch(() => undefined);
      if (editing) toast.success(t('bankingDetails.updated'));
      else modal.success(tc('modal.success'), t('bankingDetails.added'));
    } catch {
      modal.error(tc('modal.error'), t('wallet.network'));
    } finally {
      setSubmitting(false);
    }
  }

  async function setDefault(id: string) {
    try {
      const response = await fetch(`/api/withdrawal/banks/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const payload = (await response.json()) as Envelope;
      if (payload?.status !== '0') {
        reportFailure(payload?.status);
        return;
      }
      await refresh();
      toast.success(t('bankingDetails.defaultSet'));
    } catch {
      modal.error(tc('modal.error'), t('wallet.network'));
    }
  }

  async function removeAccount(id: string) {
    try {
      const response = await fetch(`/api/withdrawal/banks/${id}`, { method: 'DELETE' });
      const payload = (await response.json()) as Envelope;
      if (payload?.status !== '0') {
        reportFailure(payload?.status);
        return;
      }
      if (mode.kind === 'edit' && mode.id === id) resetForm();
      await refresh();
      toast.success(t('bankingDetails.deleted'));
    } catch {
      modal.error(tc('modal.error'), t('wallet.network'));
    }
  }

  /** The reference asks its own question first: `confirm_delete`. */
  function confirmDelete(account: BoundBankAccount) {
    modal.confirm(
      t('bankingDetails.deleteTitle'),
      t('bankingDetails.deleteConfirm'),
      () => void removeAccount(account.id),
      tc('action.delete'),
      tc('action.cancel'),
    );
  }

  return (
    <div className="banking-details" data-state={state} data-testid="banking-details-state">
      <h1 className="form-title mb-20 large has-space">{t('bankingDetails.title')}</h1>

      {state === 'loading' ? (
        <p className="mybank-state__text" aria-busy="true">
          {tc('state.loading')}
        </p>
      ) : null}

      {state === 'error' ? (
        <>
          <div className="no-info-box">{t('bankingDetails.errorBody')}</div>
          <div className="mybank-state__action">
            <PrimaryButton type="button" onClick={() => void load()}>
              {tc('action.retry')}
            </PrimaryButton>
          </div>
        </>
      ) : null}

      {info && (state === 'empty' || state === 'ready') ? (
        <div className="mybank-wrapper">
          {state === 'empty' ? (
            <p className="mybank-empty__text">{t('bankingDetails.emptyBody')}</p>
          ) : (
            <table className="bank-table">
              <thead>
                <tr>
                  <th scope="col">{t('bankingDetails.bank')}</th>
                  <th scope="col" className="bank-table__acc">
                    {t('bankingDetails.accountNumber')}
                  </th>
                  <th scope="col">{t('bankingDetails.status')}</th>
                  <th scope="col">{t('bankingDetails.action')}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} data-account={account.id}>
                    <td>{bankName(account.bankId)}</td>
                    {/* The list only ever prints the last four digits. */}
                    <td className="bank-table__acc">{maskAccountNumber(account.accountNumber)}</td>
                    <td>
                      {account.verified ? (
                        <span className="my-bank__verfied">{t('withdrawal.verified')}</span>
                      ) : (
                        <span className="my-bank-pending">{t('bankingDetails.pending')}</span>
                      )}
                    </td>
                    <td>
                      <span className="my-bank-action">
                        {account.isDefault ? (
                          <span className="my-bank-default">{t('bankingDetails.default')}</span>
                        ) : (
                          <button
                            type="button"
                            className="my-bank-action__button mybank-verify-now"
                            onClick={() => void setDefault(account.id)}
                          >
                            {t('bankingDetails.setDefault')}
                          </button>
                        )}
                        <button
                          type="button"
                          className="my-bank-action__button"
                          onClick={() => startEdit(account)}
                        >
                          {t('bankingDetails.edit')}
                        </button>
                        <button
                          type="button"
                          className="my-bank-action__button my-bank-action__danger"
                          onClick={() => confirmDelete(account)}
                        >
                          {tc('action.delete')}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* At the cap only the add form steps aside — an edit in progress
              still needs its fields. */}
          {atLimit && mode.kind === 'add' ? (
            <p className="mybank-limit">{t('bankingDetails.limitReached')}</p>
          ) : (
            <form className="mybank-form" onSubmit={submitForm} noValidate>
              <h2 className="mybank-form__title">
                {mode.kind === 'edit' ? t('bankingDetails.edit') : t('bankingDetails.newBank')}
              </h2>

              <SelectField
                id="bank-account-bank"
                label={t('bankingDetails.bankName')}
                value={bankId}
                error={errors.bankId ? tc(errors.bankId) : undefined}
                options={[
                  { value: '', label: t('withdrawal.pleaseSelect') },
                  ...(info.banks ?? []).map((bank) => ({ value: bank.id, label: bank.name })),
                ]}
                onChange={(event) => {
                  setBankId(event.target.value);
                  clearError('bankId');
                }}
              />

              {/* The name has to match the member's own name — `withdrawal.nameNote`. */}
              <TextField
                id="bank-account-name"
                label={t('bankingDetails.accountName')}
                hint={t('withdrawal.nameNote')}
                autoComplete="off"
                maxLength={40}
                value={accountName}
                error={errors.accountName ? tc(errors.accountName) : undefined}
                onChange={(event) => {
                  setAccountName(event.target.value);
                  clearError('accountName');
                }}
              />

              {/* Digits only, like the reference's `#baNo` — separators are stripped as typed. */}
              <TextField
                id="bank-account-number"
                label={t('bankingDetails.accountNumberLabel')}
                hint={t('bankingDetails.numberHint')}
                inputMode="numeric"
                autoComplete="off"
                maxLength={30}
                value={accountNumber}
                error={errors.accountNumber ? tc(errors.accountNumber) : undefined}
                onChange={(event) => {
                  setAccountNumber(normalizeAccountNumber(event.target.value));
                  clearError('accountNumber');
                }}
              />

              <div className="mybank-form__actions">
                <PrimaryButton type="submit" disabled={submitting}>
                  {submitting
                    ? tc('modal.working')
                    : mode.kind === 'edit'
                      ? t('bankingDetails.save')
                      : t('bankingDetails.add')}
                </PrimaryButton>
                {mode.kind === 'edit' ? (
                  <button type="button" className="mybank-form__cancel" onClick={resetForm}>
                    {tc('action.cancel')}
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
