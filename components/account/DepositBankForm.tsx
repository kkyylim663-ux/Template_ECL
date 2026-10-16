'use client';

import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useModal } from '@/components/ui/ModalProvider';
import { useToast } from '@/components/ui/Toast';
import { bankDepositSchema, validate, type FieldErrors } from '@/lib/forms';
import {
  formatAmountInput,
  formatMinor,
  formatMinorToInput,
  parseAmountMinor,
  quickAmounts,
} from '@/lib/format';
import type { DepositBank, DepositMethod } from '@/lib/api/schemas';
import { DepositReceiptUpload } from './DepositReceiptUpload';

/**
 * T52: the bank-transfer form of the bank tab. The reference contract is the old
 * form's `#bank-info-tpl` — pick a bank, and its name plus Bank Account Name /
 * Bank Account Number / Min / Max appear (`.bank-detail` rows) — with a copy
 * control that answers with the dictionary's `bank_copy_msg` ("Copied"). The
 * amount field carries the method's own limits and the `.deposit-amount__
 * selection-pill` quick picks; the submit button is `.deposit-btn-submit`.
 *
 * The submission is the mock of `a/makeBDepositV3` (POST /api/deposit/bank).
 * T53 then swaps the form for the receipt step (`#rec-upload-tpl`), and the
 * success dialog the reference's `showSuccess` raises only comes after UPLOAD or
 * SKIP.
 */
export function DepositBankForm({
  banks,
  method,
  currency,
}: {
  banks: DepositBank[];
  method: DepositMethod;
  currency: string;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const modal = useModal();
  const toast = useToast();
  const [bankId, setBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptStep | null>(null);

  const bank = banks.find((entry) => entry.id === bankId) ?? null;
  const schema = useMemo(
    () => bankDepositSchema({ minMinor: method.minAmountMinor, maxMinor: method.maxAmountMinor }),
    [method.minAmountMinor, method.maxAmountMinor],
  );
  const quick = quickAmounts(method.minAmountMinor, method.maxAmountMinor);
  const limits = {
    min: formatMinor(method.minAmountMinor, currency),
    max: formatMinor(method.maxAmountMinor, currency),
  };

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function copyAccountNumber() {
    if (!bank) return;
    try {
      await navigator.clipboard.writeText(bank.accountNumber);
      toast.show(t('deposit.copied'), 'success');
    } catch {
      // The async clipboard is blocked in some contexts; the select-and-copy
      // trick still works there and is what the old form itself used.
      const area = document.createElement('textarea');
      area.value = bank.accountNumber;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(area);
      toast.show(copied ? t('deposit.copied') : t('deposit.copyFailed'), copied ? 'success' : 'error');
    }
  }

  /** The dialog `_Deposit.showSuccess()` raises; UPLOAD and SKIP both land here. */
  function finish(id: string) {
    modal.success(t('deposit.requestTitle'), t('deposit.requestBody', { id }));
    setAmount('');
    setTerms(false);
    setReceipt(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const result = validate(schema, { bankId, amount, terms });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const amountMinor = parseAmountMinor(amount);
    if (amountMinor === null) return; // the schema just proved otherwise

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch('/api/deposit/bank', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bankId, amountMinor }),
      });
      const payload = (await response.json()) as {
        status?: string;
        d?: { transactionId?: string; token?: string; ticketid?: string };
      };
      if (payload?.status !== '0' || !payload.d?.transactionId) {
        throw new Error(payload?.status ?? `HTTP ${response.status}`);
      }
      const { transactionId, token, ticketid } = payload.d;
      setReceipt({ transactionId, token, ticketid });
    } catch {
      modal.error(t('deposit.failedTitle'), t('wallet.network'));
    } finally {
      setSubmitting(false);
    }
  }

  if (banks.length === 0) {
    return <p className="deposit-text">{t('deposit.noBank')}</p>;
  }

  // The receipt step replaces the form (the reference renders `#rec-upload-tpl`
  // over the same wrapper) until UPLOAD or SKIP closes the flow.
  if (receipt) {
    return (
      <div className="deposit-bank-form">
        <DepositReceiptUpload
          transactionId={receipt.transactionId}
          token={receipt.token}
          ticketid={receipt.ticketid}
          onComplete={() => finish(receipt.transactionId)}
        />
      </div>
    );
  }

  return (
    <div className="deposit-bank-form" data-testid="deposit-bank-form">
      <h3 className="deposit-bank-form__title">{t('deposit.selectBank')}</h3>

      <div
        className="deposit-banklist__wrapper"
        role="radiogroup"
        aria-label={t('deposit.selectBank')}
      >
        {banks.map((entry) => {
          const selected = entry.id === bankId;
          return (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-bank={entry.id}
              className={`deposit-banklist__tab${selected ? ' selected' : ''}`}
              onClick={() => {
                setBankId(entry.id);
                clearError('bankId');
              }}
            >
              <span className="deposit-banklist-icon__container" aria-hidden="true">
                <span
                  className="deposit-banklist-icon"
                  style={{ '--tone': String(entry.tone) } as CSSProperties}
                />
              </span>
              <span className="deposit-banklist__name">{entry.name}</span>
            </button>
          );
        })}
      </div>
      {errors.bankId ? (
        <p role="alert" className="deposit-error">
          {tc(errors.bankId)}
        </p>
      ) : null}

      {bank ? (
        <div className="bank-detail" data-testid="bank-detail">
          <h4 className="bank-detail__name">{bank.name}</h4>
          <p className="bank-detail__row">
            <span className="bank-title">{t('deposit.bankAccountName')}</span>
            <span className="bank-detail__colon">:</span>
            <span className="banking-details">{bank.accountName}</span>
          </p>
          <p className="bank-detail__row">
            <span className="bank-title">{t('deposit.bankAccountNumber')}</span>
            <span className="bank-detail__colon">:</span>
            <span className="banking-details">{bank.accountNumber}</span>
            <button type="button" className="bank-copy" onClick={() => void copyAccountNumber()}>
              {t('deposit.copy')}
            </button>
          </p>
          <p className="bank-detail__row">
            <span className="bank-title">{t('deposit.min')}</span>
            <span className="bank-detail__colon">:</span>
            <span className="banking-details">{limits.min}</span>
          </p>
          <p className="bank-detail__row">
            <span className="bank-title">{t('deposit.max')}</span>
            <span className="bank-detail__colon">:</span>
            <span className="banking-details">{limits.max}</span>
          </p>
        </div>
      ) : null}

      <form className="deposit-form-group" onSubmit={onSubmit} noValidate>
        <div className="form-group-deposit-amount">
          <label htmlFor="deposit-amount" className="deposit-amount__label">
            {t('deposit.amount')}
          </label>
          <input
            id="deposit-amount"
            name="amount"
            className="deposit-amount__input"
            inputMode="decimal"
            autoComplete="off"
            placeholder={formatMinorToInput(method.minAmountMinor)}
            value={amount}
            aria-invalid={errors.amount ? 'true' : undefined}
            onChange={(event) => {
              setAmount(formatAmountInput(event.target.value));
              clearError('amount');
            }}
          />
          <p className="deposit-amount__hint">{t('deposit.minmax', limits)}</p>
          {errors.amount ? (
            <p role="alert" className="deposit-error">
              {tc(errors.amount)}
            </p>
          ) : null}
        </div>

        <div
          className="deposit-amount__selection-wrapper"
          role="group"
          aria-label={t('deposit.amountQuick')}
        >
          {quick.map((amountMinor) => (
            <button
              key={amountMinor}
              type="button"
              className="deposit-amount__selection-pill"
              onClick={() => {
                setAmount(formatAmountInput(formatMinorToInput(amountMinor)));
                clearError('amount');
              }}
            >
              {formatMinor(amountMinor, currency, 'en-MY', { compact: true })}
            </button>
          ))}
        </div>

        <label className="deposit-terms">
          <input
            type="checkbox"
            checked={terms}
            aria-invalid={errors.terms ? 'true' : undefined}
            onChange={(event) => {
              setTerms(event.target.checked);
              clearError('terms');
            }}
          />
          {t('deposit.agreeTerms')}
        </label>
        {errors.terms ? (
          <p role="alert" className="deposit-error">
            {tc(errors.terms)}
          </p>
        ) : null}

        <div className="deposit-btn__submit-wrapper">
          <button type="submit" className="deposit-btn-submit" disabled={submitting}>
            {submitting ? t('deposit.submitting') : t('deposit.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

/** What POST /api/deposit/bank hands the receipt step (mock `token` / `ticketid`). */
type ReceiptStep = { transactionId: string; token?: string; ticketid?: string };
