'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PrimaryButton } from '@/components/ui/Field';
import { depositResultUrl } from '@/lib/deposit-flow';
import { formatCountdown, formatMinor } from '@/lib/format';
import type { DepositOutcome, GatewayOrder } from '@/lib/mock-deposit/orders';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';

const OUTCOMES: DepositOutcome[] = ['success', 'failed', 'processing'];

const SIM_LABEL: Record<DepositOutcome, string> = {
  success: 'deposit.gatewaySimSuccess',
  failed: 'deposit.gatewaySimFailed',
  processing: 'deposit.gatewaySimProcessing',
};

/**
 * The body of the mock payment-gateway window (T54). It stands in for the
 * third-party page `#btnShowPg` opens: the order and its session clock, and one
 * button per ruling the real gateway's callback could carry. A ruling is
 * recorded once (`/api/deposit/gateway/resolve`); the window then hands control
 * back the way the reference does — a `message` with `reloadable` to the opener,
 * or a same-tab jump when nothing opened it.
 */
export function DepositGatewayPanel({
  orderId,
  currency,
  region,
}: {
  orderId: string | null;
  currency: string;
  region: string;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const [state, setState] = useState<LoadState>(orderId ? 'loading' : 'empty');
  const [order, setOrder] = useState<GatewayOrder | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [serverExpired, setServerExpired] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setState('empty');
      return;
    }
    setState('loading');
    try {
      const response = await fetch(`/api/deposit/gateway?order=${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      });
      if (response.status === 404) {
        setState('empty');
        return;
      }
      const payload = (await response.json()) as { status?: string; d?: GatewayOrder | null };
      if (payload?.status !== '0' || !payload.d) throw new Error(payload?.status ?? 'invalid');
      setOrder(payload.d);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The session clock the reference's gateway window would run on its own page.
  useEffect(() => {
    if (state !== 'ready' || !order) return;
    const tick = () => setRemainingMs(Math.max(0, Date.parse(order.expiresAt) - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [state, order]);

  const expired = serverExpired || (remainingMs !== null && remainingMs <= 0);
  const depositHref = `/${region}/account/deposit?method=gateway`;

  async function simulate(outcome: DepositOutcome) {
    if (!order || busy || expired) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch('/api/deposit/gateway/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: order.orderId, outcome }),
      });
      const payload = (await response.json()) as { status?: string };
      if (payload?.status === '4') {
        setServerExpired(true);
        setBusy(false);
        return;
      }
      if (payload?.status !== '0') throw new Error(payload?.status ?? 'invalid');

      setRedirecting(true);
      const opener = window.opener as Window | null;
      if (opener) {
        // The reference's contract: a `reloadable` message, then the window closes.
        opener.postMessage(
          { source: 'deposit-gateway', reloadable: true, orderId: order.orderId, outcome },
          window.location.origin,
        );
        window.close();
      } else {
        // Opened directly (no popup): the reference's fallback is a redirect.
        window.setTimeout(() => {
          window.location.assign(depositResultUrl(region, order.orderId, outcome));
        }, 800);
      }
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  if (state === 'loading') {
    return (
      <div
        className="deposit-gateway"
        data-state="loading"
        data-testid="gateway-state"
        aria-busy="true"
      >
        <p className="deposit-state__text">{tc('state.loading')}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="deposit-gateway" data-state="error" data-testid="gateway-state">
        <div className="no-info-box">{t('deposit.gatewayError')}</div>
        <div className="deposit-state__action">
          <PrimaryButton type="button" onClick={() => void load()}>
            {tc('action.retry')}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (state === 'empty' || !order) {
    return (
      <div className="deposit-gateway" data-state="empty" data-testid="gateway-state">
        <div className="no-info-box">{t('deposit.gatewayUnknownOrder')}</div>
        <div className="deposit-state__action">
          <Link className="deposit-gateway__back" href={depositHref}>
            {t('deposit.resultBackToDeposit')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="deposit-gateway" data-state="ready" data-testid="gateway-state">
      <div className="deposit-gateway__card bank-detail">
        <p className="bank-detail__row">
          <span className="bank-title">{t('deposit.transactionId', { id: order.orderId })}</span>
        </p>
        <p className="bank-detail__row">
          <span className="bank-title">{t('deposit.amount')}</span>
          <span className="bank-detail__colon">:</span>
          <span className="banking-details">{formatMinor(order.amountMinor, currency)}</span>
        </p>
        <p className="bank-detail__row">
          <span className="bank-title">{t('deposit.gatewayExpires')}</span>
          <span className="bank-detail__colon">:</span>
          <span
            className="deposit-gateway__countdown banking-details"
            data-testid="gateway-countdown"
          >
            {expired
              ? t('deposit.gatewayExpired')
              : remainingMs === null
                ? '--:--'
                : formatCountdown(remainingMs)}
          </span>
        </p>
      </div>

      <p className="deposit-gateway__note">{t('deposit.gatewayDemoNote')}</p>
      {redirecting ? (
        <p className="deposit-gateway__redirect" role="status">
          {t('deposit.gatewayRedirect')}
        </p>
      ) : null}
      {failed ? (
        <p role="alert" className="deposit-error">
          {t('deposit.gatewayResolveFailed')}
        </p>
      ) : null}

      <div className="deposit-gateway__actions">
        {OUTCOMES.map((outcome) => (
          <button
            key={outcome}
            type="button"
            className={`deposit-gateway__btn deposit-gateway__btn--${outcome}`}
            data-testid={`gateway-sim-${outcome}`}
            disabled={busy || expired}
            onClick={() => void simulate(outcome)}
          >
            {t(SIM_LABEL[outcome])}
          </button>
        ))}
      </div>

      {expired ? (
        <div className="deposit-state__action">
          <Link className="deposit-gateway__back" href={depositHref}>
            {t('deposit.resultBackToDeposit')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
