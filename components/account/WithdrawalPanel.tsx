'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { IconSprite } from '@/components/ui/IconSprite';
import { PrimaryButton } from '@/components/ui/Field';
import { formatMinorPlain } from '@/lib/format';
import { regionPath } from '@/config/nav';
import { withdrawalInfoSchema, type WithdrawalInfo } from '@/lib/api/schemas';
import {
  buildVerifyRows,
  maskAccountNumber,
  verifiedBankAccounts,
  verifyRowsComplete,
  type WithdrawalVerifyRow,
  type WithdrawalVerifyRowId,
} from '@/lib/withdrawal-flow';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';

const ROW_LABEL: Record<WithdrawalVerifyRowId, string> = {
  mobile: 'withdrawal.mobileNumber',
  bank: 'withdrawal.bankAccountLabel',
  email: 'withdrawal.emailLabel',
};

/**
 * The withdrawal page body. The reference renders a client-only chunk that was
 * never captured (my_mywithdrawal.html is a 0-byte 302), so the chrome follows
 * its stylesheet (`.withdraw-header` + the phone-only `__wrapper`, the
 * `.withdraw-verify__list-*` table, the `.widthdraw-dropdown-select` row with
 * the `.withdraw-plus` tile, `.withdraw-info`) and its copy comes from the
 * Fluent resources embedded in the shared bundle. The verified-account row
 * stands in for the reference's `getMyBankAccVerified` dropdown; the request
 * form arrives with T58, and the plus tile now leads to the Banking Details page
 * (`/account/banks`) that binds, edits and drops accounts — the reference's own
 * plus target is the one thing its capture left open.
 */
export function WithdrawalPanel({ region }: { region: string }) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const [state, setState] = useState<LoadState>('loading');
  const [info, setInfo] = useState<WithdrawalInfo | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const response = await fetch('/api/withdrawal/info', { cache: 'no-store' });
      const payload = (await response.json()) as { status?: string; d?: unknown };
      if (payload?.status !== '0') throw new Error(payload?.status ?? `HTTP ${response.status}`);
      const data = withdrawalInfoSchema.parse(payload.d);
      setInfo(data);
      setState(verifiedBankAccounts(data).length === 0 ? 'empty' : 'ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = info
    ? buildVerifyRows({
        region,
        kycStatus: info.kycStatus,
        hasVerifiedBank: verifiedBankAccounts(info).length > 0,
      })
    : [];

  return (
    <div className="withdrawal-panel" data-state={state} data-testid="withdrawal-state">
      <IconSprite only={['plus']} />
      <div className="withdraw-header__wrapper">
        <div className="withdraw-header">
          {/* The reference draws a 71×71 illustration here; it is not shipped. */}
          <span className="withdraw-alert" aria-hidden="true">
            <Icon name="withdraw" size={40} />
          </span>
          <h1>{t('withdrawal.header')}</h1>
        </div>
        {info && !verifyRowsComplete(rows) ? (
          <p className="withdraw-verify-tips">
            {t(region === 'sg' ? 'withdrawal.verifyTipsSg' : 'withdrawal.verifyTipsMy')}
          </p>
        ) : null}
      </div>

      {state === 'loading' ? (
        <p className="withdraw-state__text" aria-busy="true">
          {tc('state.loading')}
        </p>
      ) : null}

      {state === 'error' ? (
        <>
          <div className="no-info-box">{t('withdrawal.errorBody')}</div>
          <div className="withdraw-state__action">
            <PrimaryButton type="button" onClick={() => void load()}>
              {tc('action.retry')}
            </PrimaryButton>
          </div>
        </>
      ) : null}

      {info && (state === 'empty' || state === 'ready') ? (
        <>
          <VerifyList rows={rows} region={region} />
          <div className="withdraw-plus__wrapper">
            {state === 'empty' ? (
              <p className="withdraw-empty__text">{t('withdrawal.noAvailableBank')}</p>
            ) : (
              <AccountRow info={info} />
            )}
            <Link
              className="withdraw-plus"
              href={regionPath(region, '/account/banks')}
              aria-label={t('withdrawal.addBank')}
            >
              <Icon name="plus" size={20} />
            </Link>
          </div>
          <WithdrawalInfoBlock info={info} />
        </>
      ) : null}
    </div>
  );
}

/** The reference's `getMyBankAccVerified` dropdown: label, account, badge. */
function AccountRow({ info }: { info: WithdrawalInfo }) {
  const t = useTranslations('account');
  const accounts = verifiedBankAccounts(info);
  const bankName = (bankId: string) => info.banks.find((bank) => bank.id === bankId)?.name ?? bankId;

  return (
    <div className="widthdraw-dropdown-select">
      <span className="widthdraw-dropdown-select__span">{t('withdrawal.method')}</span>
      <span className="widthdraw-dropdown-select__span span-2">
        {/* The house select skin (components/ui/Field); the reference's own
            control markup was never captured. */}
        <select
          id="bankAccountId"
          className="border-line bg-panel text-ink focus:border-accent min-h-11 w-full rounded-[var(--radius-tag)] border px-3 py-2 text-sm outline-none"
          defaultValue=""
        >
          <option value="">{t('withdrawal.pleaseSelect')}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {`${bankName(account.bankId)} ${maskAccountNumber(account.accountNumber)}`}
            </option>
          ))}
        </select>
      </span>
      <span className="widthdraw-dropdown-select__span span-3">
        <span className="withdraw-verified">{t('withdrawal.verified')}</span>
      </span>
    </div>
  );
}

/** "What to verify": the market's rows with their status and the fix link. */
function VerifyList({ rows, region }: { rows: WithdrawalVerifyRow[]; region: string }) {
  const t = useTranslations('account');

  return (
    <div className="withdraw-verify__list-wrapper">
      <div className="withdraw-verify__list-header">
        <span className="withdraw-verify__list-what">{t('withdrawal.whatToVerify')}</span>
        <span className="withdraw-verify__list-status">{t('withdrawal.statusLabel')}</span>
      </div>
      {rows.map((row) => (
        <div key={row.id} className="withdraw-verify__list-body">
          <span className="withdraw-verify__list-what">{t(ROW_LABEL[row.id])}</span>
          <span className="withdraw-verify__list-status__wrapper">
            <span
              className={`withdraw-verify__list-status ${
                row.verified ? 'withdraw-verify__verified' : 'withdraw-verify__unverified'
              }`}
            >
              {row.verified ? t('withdrawal.verified') : t('withdrawal.unverified')}
            </span>
            {row.verified ? (
              <Icon name="check" size={16} className="withdraw-verify__list-icon" />
            ) : (
              <a
                className="withdraw-verify-now"
                href={row.id === 'bank' ? '#' : regionPath(region, '/account/profile')}
              >
                {t('withdrawal.verifyNow')}
              </a>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Limits + the reference's own reminder sentences. */
function WithdrawalInfoBlock({ info }: { info: WithdrawalInfo }) {
  const t = useTranslations('account');

  return (
    <div className="withdraw-info">
      <p className="withdraw-info__limits">
        {t('withdrawal.minMax', {
          min: formatMinorPlain(info.limits.minAmountMinor),
          max: formatMinorPlain(info.limits.maxAmountMinor),
        })}
      </p>
      <p className="withdraw-info__line">{t('withdrawal.limitsTip')}</p>
      <p className="withdraw-info__line">{t('withdrawal.frequencyTip')}</p>
      <p className="withdraw-info__line">{t('withdrawal.nameNote')}</p>
      <div className="withdraw-reminder">
        <p className="withdraw-reminder__title">{t('withdrawal.friendlyReminder')}</p>
        <ul className="withdraw-reminder__list">
          {(['reminderNote1', 'reminderNote2', 'reminderNote3', 'reminderNote4'] as const).map(
            (key) => (
              <li key={key}>{t(`withdrawal.${key}`)}</li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
