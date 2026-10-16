'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useModal } from '@/components/ui/ModalProvider';
import { gatewayDepositSchema, validate, type FieldErrors } from '@/lib/forms';
import {
  formatAmountInput,
  formatMinor,
  formatMinorToInput,
  parseAmountMinor,
  quickAmounts,
} from '@/lib/format';
import { depositGatewayUrl, depositResultUrl } from '@/lib/deposit-flow';
import type { DepositMethod } from '@/lib/api/schemas';

/**
 * T54: the gateway tab's form. Submitting is the mock of the reference's
 * `a/makePDeposit` (POST /api/deposit/gateway) and swaps the form for the old
 * `#pg-tpl` step — the remark plus the `#btnShowPg` SUBMIT — whose click is the
 * reference's `_Deposit.showPg(pgUrl)`: it opens the (mock) gateway window with
 * the same `window.open` features, turns itself into `sprocessing`
 * ("Processing..."), listens for the window's `reloadable` message and then
 * turns the browser over to the in-site result page.
 */
export function DepositGatewayForm({
  method,
  currency,
  region,
}: {
  method: DepositMethod;
  currency: string;
  region: string;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const modal = useModal();
  const [amount, setAmount] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<{ orderId: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const doneRef = useRef(false);

  const schema = useMemo(
    () =>
      gatewayDepositSchema({ minMinor: method.minAmountMinor, maxMinor: method.maxAmountMinor }),
    [method.minAmountMinor, method.maxAmountMinor],
  );
  const quick = quickAmounts(method.minAmountMinor, method.maxAmountMinor);

  // While the gateway window is open: a `reloadable` message hands the outcome
  // back (the reference's contract); a window closed without one returns the
  // SUBMIT button to its idle state.
  useEffect(() => {
    if (!processing || !step) return;
    doneRef.current = false;

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        source?: string;
        reloadable?: boolean;
        orderId?: string;
        outcome?: string;
      } | null;
      if (!data || data.source !== 'deposit-gateway' || data.reloadable !== true) return;
      if (typeof data.orderId !== 'string' || typeof data.outcome !== 'string') return;
      doneRef.current = true;
      window.location.assign(depositResultUrl(region, data.orderId, data.outcome));
    }

    window.addEventListener('message', onMessage);
    const poll = window.setInterval(() => {
      if (doneRef.current) return;
      if (popupRef.current?.closed) {
        window.clearInterval(poll);
        setProcessing(false);
      }
    }, 700);

    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(poll);
    };
  }, [processing, step, region]);

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const result = validate(schema, { amount, terms });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const amountMinor = parseAmountMinor(amount);
    if (amountMinor === null) return; // the schema just proved otherwise

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch('/api/deposit/gateway', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountMinor }),
      });
      const payload = (await response.json()) as { status?: string; d?: { orderId?: string } };
      if (payload?.status !== '0' || !payload.d?.orderId) {
        throw new Error(payload?.status ?? `HTTP ${response.status}`);
      }
      setStep({ orderId: payload.d.orderId });
    } catch {
      modal.error(t('deposit.failedTitle'), t('wallet.network'));
    } finally {
      setSubmitting(false);
    }
  }

  function openGateway() {
    if (!step || processing) return;
    const url = depositGatewayUrl(region, step.orderId);
    // The reference's own features, verbatim from `_Deposit.showPg`.
    const popup = window.open(
      url,
      'Payment',
      'width=800,height=700,toolbar=no, location=no, menubar=0',
    );
    if (!popup) {
      // Popup blocked (or not allowed): fall back to the same tab.
      setProcessing(true);
      window.location.assign(url);
      return;
    }
    popupRef.current = popup;
    setProcessing(true);
  }

  // The `#pg-tpl` step replaces the form, exactly as the reference renders it
  // over `[data-dom=deposit-form-wrapper]` after `a/makePDeposit` answers.
  if (step) {
    return (
      <div className="deposit-gateway-pg" data-testid="gateway-pg-step">
        <p className="deposit-text">{t('deposit.methodGatewayHint')}</p>
        <div className="deposit-btn__submit-wrapper">
          <button
            type="button"
            id="btnShowPg"
            className="deposit-btn-submit"
            disabled={processing}
            onClick={openGateway}
          >
            {processing ? t('deposit.proceeding') : t('deposit.proceedGateway')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="deposit-gateway-form" data-testid="deposit-gateway-form">
      <form className="deposit-form-group" onSubmit={onSubmit} noValidate>
        <div className="form-group-deposit-amount">
          <label htmlFor="deposit-gateway-amount" className="deposit-amount__label">
            {t('deposit.amount')}
          </label>
          <input
            id="deposit-gateway-amount"
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
          <p className="deposit-amount__hint">
            {t('deposit.gatewayMinDeposit', { min: formatMinor(method.minAmountMinor, currency) })}
          </p>
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
