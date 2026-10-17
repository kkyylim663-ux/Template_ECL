'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/Field';
import { formatMinor } from '@/lib/format';
import { creditDeposit, isCreditable } from '@/lib/deposit-credit';
import type { DepositResultStatus } from '@/lib/deposit-flow';
import type { GatewayOrder } from '@/lib/mock-deposit/orders';
import { walletService } from '@/lib/api/wallet';
import { useSession } from '@/lib/session/useSession';

type DetailsState = 'none' | 'loading' | 'error' | 'empty' | 'ready';

const VARIANT: Record<DepositResultStatus, { icon: IconName; tone: string }> = {
  success: { icon: 'success', tone: 'success' },
  failed: { icon: 'alert', tone: 'failed' },
  processing: { icon: 'pending', tone: 'processing' },
  unknown: { icon: 'info', tone: 'unknown' },
};

/** Each ruled layout's title and body — the reference's own `pg_deposit_*` texts. */
function ruledText(
  status: DepositResultStatus,
  t: (key: string) => string,
): { heading: string; body: string } {
  switch (status) {
    case 'success':
      return { heading: t('deposit.resultSuccessTitle'), body: t('deposit.resultSuccessBody') };
    case 'failed':
      return { heading: t('deposit.failedTitle'), body: t('deposit.resultFailedBody') };
    case 'processing':
      return { heading: t('deposit.requestTitle'), body: t('deposit.resultProcessingBody') };
    default:
      return { heading: t('deposit.resultUnknownTitle'), body: t('deposit.resultUnknownBody') };
  }
}

/**
 * The in-site result page the mock gateway returns to (T54). The three ruled
 * layouts carry the reference dictionary's own texts (`pg_deposit_success /
 * fail / pending`); an unrecognised `?status=` gets the unknown layout. The
 * optional `?order=` details block is read-only — the ruling was recorded once
 * by the gateway window, so this page (and a refresh of it) never replays it.
 */
export function DepositResult({
  status,
  orderId,
  currency,
  region,
}: {
  status: DepositResultStatus;
  orderId: string | null;
  currency: string;
  region: string;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const [details, setDetails] = useState<DetailsState>(orderId ? 'loading' : 'none');
  const [order, setOrder] = useState<GatewayOrder | null>(null);

  const loadDetails = useCallback(async () => {
    if (!orderId) {
      setDetails('none');
      return;
    }
    setDetails('loading');
    try {
      const response = await fetch(`/api/deposit/gateway?order=${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      });
      if (response.status === 404) {
        setDetails('empty');
        return;
      }
      const payload = (await response.json()) as { status?: string; d?: GatewayOrder | null };
      if (payload?.status !== '0' || !payload.d) {
        setDetails('empty');
        return;
      }
      setOrder(payload.d);
      setDetails('ready');
    } catch {
      setDetails('error');
    }
  }, [orderId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  // The wallet is bound to the signed-in account only once the session is ready;
  // crediting earlier would be refused as a foreign account (T42b isolation).
  const { ready: sessionReady } = useSession();
  useEffect(() => {
    if (!sessionReady || !isCreditable(order)) return;
    creditDeposit(order, {
      at: new Date().toISOString(),
      currency,
      labels: {
        method: t('deposit.gatewayTitle'),
        subject: t('deposit.successTitle'),
        body: (amount) => t('deposit.successBody', { amount }),
      },
      credit: (amountMinor, idempotencyKey) => walletService.deposit(amountMinor, idempotencyKey),
    }).catch(() => undefined);
  }, [sessionReady, order, currency, t]);

  const variant = VARIANT[status];
  const text = ruledText(status, t);
  const base = `/${region}`;
  const actions: { label: string; href: string; primary: boolean }[] = [];
  if (status === 'success') {
    actions.push({
      label: t('deposit.resultViewHistory'),
      href: `${base}/account/history`,
      primary: true,
    });
    actions.push({
      label: t('deposit.resultDepositAgain'),
      href: `${base}/account/deposit`,
      primary: false,
    });
  } else if (status === 'failed') {
    actions.push({
      label: t('deposit.resultDepositAgain'),
      href: `${base}/account/deposit`,
      primary: true,
    });
    actions.push({
      label: t('deposit.resultViewHistory'),
      href: `${base}/account/history`,
      primary: false,
    });
  } else if (status === 'processing') {
    actions.push({
      label: t('deposit.resultViewHistory'),
      href: `${base}/account/history`,
      primary: true,
    });
    actions.push({
      label: t('deposit.resultBackToDeposit'),
      href: `${base}/account/deposit`,
      primary: false,
    });
  } else {
    actions.push({
      label: t('deposit.resultBackToDeposit'),
      href: `${base}/account/deposit`,
      primary: true,
    });
  }

  return (
    <div className="deposit-result" data-status={status} data-testid="deposit-result">
      <div className={`deposit-result__panel deposit-result__panel--${variant.tone}`}>
        <Icon name={variant.icon} size={44} className="deposit-result__icon" />
        <h2 className="deposit-result__title">{text.heading}</h2>
        <p className="deposit-result__body">{text.body}</p>

        {details !== 'none' ? (
          <div
            className="deposit-result__details bank-detail"
            data-testid="result-details"
            data-state={details}
          >
            {details === 'loading' ? (
              <p className="deposit-result__detail-text">{tc('state.loading')}</p>
            ) : null}
            {details === 'empty' ? (
              <p className="deposit-result__detail-text">{t('deposit.resultOrderMissing')}</p>
            ) : null}
            {details === 'error' ? (
              <>
                <p className="deposit-result__detail-text">{t('deposit.gatewayError')}</p>
                <div className="deposit-state__action">
                  <PrimaryButton type="button" onClick={() => void loadDetails()}>
                    {tc('action.retry')}
                  </PrimaryButton>
                </div>
              </>
            ) : null}
            {details === 'ready' && order ? (
              <>
                <p className="bank-detail__row">
                  <span className="bank-title">
                    {t('deposit.transactionId', { id: order.orderId })}
                  </span>
                </p>
                <p className="bank-detail__row">
                  <span className="bank-title">{t('deposit.amount')}</span>
                  <span className="bank-detail__colon">:</span>
                  <span className="banking-details">
                    {formatMinor(order.amountMinor, currency)}
                  </span>
                </p>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="deposit-result__actions">
          {actions.map((action) => (
            <ActionLink key={action.label} href={action.href} primary={action.primary}>
              {action.label}
            </ActionLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  primary,
  children,
}: {
  href: string;
  primary: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      className={`deposit-result__action${primary ? ' deposit-result__action--primary' : ''}`}
      href={href}
    >
      {children}
    </Link>
  );
}
