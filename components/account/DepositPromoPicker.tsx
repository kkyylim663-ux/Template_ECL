'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Markdown } from '@/components/content/Markdown';
import { Modal } from '@/components/ui/Modal';
import type { DepositPromoQuote } from '@/lib/api/deposit-promo';
import type { DepositMethodId, Promotion } from '@/lib/api/schemas';
import { formatMinor } from '@/lib/format';

/**
 * T55: the bonus picker under the amount. It offers the deposit promotions plus
 * "No bonus", opens each offer's terms from the T&C link, and shows the bonus and
 * turnover the mock route quotes for the amount typed. The picker computes no
 * figure itself; a deposit under the method's minimum gets the minimum notice.
 */
export function DepositPromoPicker({
  amountMinor,
  methodId,
  minMinor,
  currency,
  value,
  onChange,
}: {
  amountMinor: number | null;
  methodId: DepositMethodId;
  minMinor: number;
  currency: string;
  value: string;
  onChange: (promoId: string) => void;
}) {
  const t = useTranslations('account');
  const [promos, setPromos] = useState<Promotion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [quote, setQuote] = useState<{ promoId: string; data: DepositPromoQuote } | null>(null);
  const [termsOf, setTermsOf] = useState<Promotion | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/deposit/promos', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: { status?: string; d?: Promotion[] }) => {
        if (cancelled) return;
        if (payload?.status !== '0' || !Array.isArray(payload.d)) throw new Error('promos');
        setPromos(payload.d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!value || amountMinor === null) return;
    let cancelled = false;
    fetch('/api/deposit/promo/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ promoId: value, amountMinor, methodId }),
    })
      .then((response) => response.json())
      .then((payload: { status?: string; d?: DepositPromoQuote }) => {
        if (cancelled) return;
        setQuote(payload?.status === '0' && payload.d ? { promoId: value, data: payload.d } : null);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, amountMinor, methodId]);

  if (failed) return <p className="deposit-error">{t('deposit.promoLoadFailed')}</p>;
  if (promos === null) return null;

  const shown = value && amountMinor !== null && quote?.promoId === value ? quote.data : null;

  return (
    <div className="deposit-promo" data-testid="deposit-promo">
      <p className="deposit-promo__label" id="deposit-promo-label">
        {t('deposit.promo')}
      </p>
      <div className="deposit-promo__list" role="radiogroup" aria-labelledby="deposit-promo-label">
        <label className="deposit-promo__option">
          <input
            type="radio"
            name="promoId"
            value=""
            checked={value === ''}
            onChange={() => onChange('')}
          />
          {t('deposit.promoNone')}
        </label>
        {promos.map((promo) => (
          <div key={promo.id} className="deposit-promo__item">
            <label className="deposit-promo__option">
              <input
                type="radio"
                name="promoId"
                value={promo.id}
                checked={value === promo.id}
                onChange={() => onChange(promo.id)}
              />
              {promo.title}
            </label>
            <button
              type="button"
              className="deposit-promotion-tnc"
              onClick={() => setTermsOf(promo)}
            >
              {t('deposit.promoTnc')}
            </button>
          </div>
        ))}
      </div>

      {shown?.belowMinimum ? (
        <p className="deposit-amount__hint">
          {t('deposit.promoBelowMin', { min: formatMinor(minMinor, currency) })}
        </p>
      ) : null}
      {shown && !shown.belowMinimum ? (
        <dl className="deposit-promo__quote" data-testid="deposit-promo-quote">
          <div className="deposit-promo__row">
            <dt>{t('deposit.promoBonus')}</dt>
            <dd>{formatMinor(shown.bonusMinor, currency)}</dd>
          </div>
          <div className="deposit-promo__row">
            <dt>{t('deposit.promoRollover')}</dt>
            <dd>{formatMinor(shown.rolloverMinor, currency)}</dd>
          </div>
        </dl>
      ) : null}

      <Modal
        open={termsOf !== null}
        onClose={() => setTermsOf(null)}
        variant="rules"
        title={termsOf?.title ?? t('deposit.promoRulesTitle')}
        actions={
          <button type="button" className="deposit-promo__close" onClick={() => setTermsOf(null)}>
            {t('deposit.promoClose')}
          </button>
        }
      >
        {termsOf ? <Markdown source={termsOf.rules} /> : null}
      </Modal>
    </div>
  );
}
