'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useModal } from '@/components/ui/ModalProvider';
import { formatAmountInput, formatMinorPlain, parseAmountMinor } from '@/lib/format';
import { validate, withdrawalRequestSchema, type FieldErrors } from '@/lib/forms';
import type { WithdrawalInfo } from '@/lib/api/schemas';
import { useWallets } from '@/lib/api/useWallets';
import { walletService, WalletError } from '@/lib/api/wallet';
import { maskAccountNumber } from '@/lib/withdrawal-flow';

/** The server's reject codes that carry their own wording (the rest fall back to the generic failure). */
const FAILURE_KEYS: Record<string, string> = {
  '201': 'withdrawal.bankError',
  '212': 'withdrawal.pendingExists',
  '213': 'withdrawal.turnoverReason',
  '501': 'withdrawal.dailyLimit',
};

function failureKey(error: unknown): string {
  if (error instanceof WalletError) return 'withdrawal.insufficient';
  const code = error instanceof Error ? error.message : '';
  return FAILURE_KEYS[code] ?? 'withdrawal.failedBody';
}

/**
 * T58: the payout request under the account row. The balance is checked before
 * the request is sent, the server applies the limits, pending-request, turnover
 * and daily-cap rules, and the wallet is debited only after the server accepts.
 * One attempt carries one idempotency key, so a double submit writes one row.
 * Turnover still owed disables the form, as the reference does.
 */
export function WithdrawalRequestForm({ info, accountId }: { info: WithdrawalInfo; accountId: string }) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const modal = useModal();
  const { ready, mainMinor } = useWallets();
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const requestKey = useRef<string | null>(null);

  const { minAmountMinor, maxAmountMinor } = info.limits;
  const schema = useMemo(
    () => withdrawalRequestSchema({ minMinor: minAmountMinor, maxMinor: maxAmountMinor }),
    [minAmountMinor, maxAmountMinor],
  );
  const turnover = info.turnoverRemainingMinor;
  const account = info.bankAccounts.find((entry) => entry.id === accountId);
  const bankName = info.banks.find((bank) => bank.id === account?.bankId)?.name ?? account?.bankId ?? '';
  const accountLabel = account ? `${bankName} ${maskAccountNumber(account.accountNumber)}` : '';
  const blocked = submitting || turnover > 0 || !ready;

  async function submit(amountMinor: number) {
    inFlight.current = true;
    setSubmitting(true);
    const key = (requestKey.current ??= crypto.randomUUID());
    try {
      const response = await fetch('/api/withdrawal/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bankAccountId: accountId, amountMinor, idempotencyKey: key }),
      });
      const payload = (await response.json()) as { status?: string };
      if (payload?.status !== '0') throw new Error(payload?.status ?? `HTTP ${response.status}`);

      await walletService.withdraw(amountMinor, key);
      requestKey.current = null;
      setAmount('');
      setErrors({});
      modal.success(t('withdrawal.successTitle'), t('withdrawal.successBody'));
    } catch (error) {
      modal.error(t('withdrawal.failedTitle'), t(failureKey(error)));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || blocked) return;

    const result = validate(schema, { bankAccountId: accountId, amount });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const amountMinor = parseAmountMinor(amount);
    if (amountMinor === null) return;
    if (amountMinor > mainMinor) {
      setErrors({ amount: 'validation.withdrawInsufficient' });
      return;
    }

    setErrors({});
    modal.confirm(
      t('withdrawal.confirmTitle'),
      t('withdrawal.confirmBody', { amount: formatMinorPlain(amountMinor), account: accountLabel }),
      () => void submit(amountMinor),
      tc('action.confirm'),
      tc('action.cancel'),
    );
  }

  return (
    <form className="withdraw-request" noValidate onSubmit={onSubmit} data-testid="withdrawal-form">
      <div className="form-group-deposit-amount">
        <label htmlFor="withdrawal-amount" className="deposit-amount__label">
          {t('withdrawal.amount')}
        </label>
        <input
          id="withdrawal-amount"
          name="amount"
          className="deposit-amount__input"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          aria-invalid={errors.amount ? 'true' : undefined}
          onChange={(event) => {
            setAmount(formatAmountInput(event.target.value));
            requestKey.current = null;
            setErrors({});
          }}
        />
        {errors.bankAccountId ? (
          <p role="alert" className="deposit-error">
            {tc(errors.bankAccountId)}
          </p>
        ) : null}
        {errors.amount ? (
          <p role="alert" className="deposit-error">
            {tc(errors.amount)}
          </p>
        ) : null}
      </div>

      {turnover > 0 ? (
        <p role="status" className="withdraw-turnover">
          {t('withdrawal.turnoverReason')}
          <br />
          {t('withdrawal.turnoverRemaining', { amount: formatMinorPlain(turnover) })}
        </p>
      ) : null}

      <div className="deposit-btn__submit-wrapper">
        <button type="submit" className="deposit-btn-submit" disabled={blocked}>
          {submitting ? t('withdrawal.submitting') : t('withdrawal.submit')}
        </button>
      </div>
    </form>
  );
}
