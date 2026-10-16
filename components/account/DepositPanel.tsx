'use client';

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { brand } from '@/config/brand';
import { Icon } from '@/components/ui/Icon';
import { IconSprite } from '@/components/ui/IconSprite';
import { PrimaryButton } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { formatMinor } from '@/lib/format';
import { DepositBankForm } from './DepositBankForm';
import {
  DEPOSIT_METHOD_IDS,
  depositCatalogSchema,
  isDepositMethodId,
  type DepositCatalog,
  type DepositChannel,
  type DepositMethodId,
} from '@/lib/api/schemas';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';

const METHOD_LABEL: Record<DepositMethodId, string> = {
  bank: 'deposit.methodBank',
  gateway: 'deposit.methodGateway',
  qr: 'deposit.methodQr',
};

const METHOD_HINT: Record<DepositMethodId, string> = {
  bank: 'deposit.methodBankHint',
  gateway: 'deposit.methodGatewayHint',
  qr: 'deposit.methodQrHint',
};

const METHOD_ICON: Record<DepositMethodId, 'transfer' | 'globe' | 'wallet'> = {
  bank: 'transfer',
  gateway: 'globe',
  qr: 'wallet',
};

/**
 * The deposit page body: the reference's method tabs (`.deposit-tab__wrapper`
 * — a green strip of #353537 pills whose selected one turns mustard), the
 * active method's description, its limits and fees, and the 1014-wide "please
 * note" block underneath. The catalog is fetched client-side so the surface
 * has real loading / empty / retryable-error states, and the open tab lives in
 * `?method=`.
 */
export function DepositPanel({
  initialMethod,
  currency,
}: {
  initialMethod: DepositMethodId;
  currency: string;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const modal = useModal();
  const [state, setState] = useState<LoadState>('loading');
  const [catalog, setCatalog] = useState<DepositCatalog | null>(null);
  const [method, setMethod] = useState<DepositMethodId>(initialMethod);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const response = await fetch('/api/deposit/methods', { cache: 'no-store' });
      const payload = (await response.json()) as { status?: string; d?: unknown };
      if (payload?.status !== '0') throw new Error(payload?.status ?? `HTTP ${response.status}`);
      const data = depositCatalogSchema.parse(payload.d);
      setCatalog(data);
      setState(data.methods.length === 0 ? 'empty' : 'ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The address bar is the record of the open tab — `history.replaceState`,
  // not `router.replace`, because the panel already holds the data and a
  // router write would re-render the tree from the server for one click.
  const select = useCallback((id: DepositMethodId) => {
    setMethod(id);
    const url = new URL(window.location.href);
    url.searchParams.set('method', id);
    window.history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    function onPopState() {
      const next = new URL(window.location.href).searchParams.get('method');
      if (isDepositMethodId(next)) setMethod(next);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (state === 'loading') {
    return (
      <div className="deposit-panel" data-state="loading" data-testid="deposit-state" aria-busy="true">
        <div className="deposit-tab__wrapper" aria-hidden="true">
          {DEPOSIT_METHOD_IDS.map((id) => (
            <span key={id} className="deposit-tab deposit-tab-skeleton" />
          ))}
        </div>
        <p className="deposit-state__text">{tc('state.loading')}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="deposit-panel" data-state="error" data-testid="deposit-state">
        <div className="no-info-box">{t('deposit.errorBody')}</div>
        <div className="deposit-state__action">
          <PrimaryButton type="button" onClick={() => void load()}>
            {tc('action.retry')}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (state === 'empty' || !catalog) {
    return (
      <div className="deposit-panel" data-state="empty" data-testid="deposit-state">
        <div className="no-info-box">{t('deposit.emptyBody')}</div>
      </div>
    );
  }

  const active = catalog.methods.find((entry) => entry.id === method) ?? catalog.methods[0];
  // The reference routes the online-banking rails through the gateway tab and
  // the wallets / QR rails through the QR tab (its own getBanks btype 0/1).
  const gatewayChannels = catalog.channels.filter((channel) => channel.kind === 'online-banking');
  const qrChannels = catalog.channels.filter((channel) => channel.kind !== 'online-banking');

  return (
    <div className="deposit-panel" data-state="ready" data-testid="deposit-state">
      <div className="deposit-tab__wrapper" role="tablist" aria-label={t('deposit.methodLabel')}>
        {catalog.methods.map((entry) => {
          const selected = entry.id === active.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`deposit-tab${selected ? ' selected' : ''}`}
              onClick={() => select(entry.id)}
            >
              <span className="deposit-tab__container">
                <Icon name={METHOD_ICON[entry.id]} size={20} className="deposit-tab__icon" />
                <span className="deposit-tab__name">{t(METHOD_LABEL[entry.id])}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="deposit-block" role="tabpanel" aria-label={t(METHOD_LABEL[active.id])}>
        <div className="deposit-container">
          <DepositSection title={t('deposit.sectionHow')}>
            <p className="deposit-text">{t(METHOD_HINT[active.id])}</p>
            {active.id === 'bank' ? (
              <>
                <IconSprite only={['play']} />
                <p className="deposit-atm-tips">{t('deposit.atmTips', { merchant: brand.name })}</p>
                <button
                  type="button"
                  className="deposit-watch-tutorial"
                  onClick={() => modal.alert(t('deposit.tutorialTitle'), t('deposit.tutorialBody'))}
                >
                  <Icon name="play" size={16} className="deposit-watch-tutorial__icon" />
                  {t('deposit.watchTutorial')}
                </button>
              </>
            ) : null}
            {active.id === 'gateway' ? (
              <ChannelCards channels={gatewayChannels} currency={currency} />
            ) : null}
            {active.id === 'qr' ? (
              <>
                <div className="deposit-crypto-qrcode" aria-hidden="true" />
                <ChannelCards channels={qrChannels} currency={currency} />
              </>
            ) : null}
          </DepositSection>

          <DepositSection title={t('deposit.sectionLimits')}>
            <dl className="deposit-limit">
              <div className="deposit-limit__row">
                <dt className="deposit-limit__label">{t('deposit.min')}</dt>
                <dd className="deposit-limit__value">
                  {formatMinor(active.minAmountMinor, currency)}
                </dd>
              </div>
              <div className="deposit-limit__row">
                <dt className="deposit-limit__label">{t('deposit.max')}</dt>
                <dd className="deposit-limit__value">
                  {formatMinor(active.maxAmountMinor, currency)}
                </dd>
              </div>
              <div className="deposit-limit__row">
                <dt className="deposit-limit__label">{t('deposit.fee')}</dt>
                <dd className="deposit-limit__value">
                  {active.feePct === 0 ? t('deposit.feeNone') : `${active.feePct}%`}
                </dd>
              </div>
            </dl>
          </DepositSection>
        </div>

        {active.id === 'bank' ? (
          <DepositBankForm banks={catalog.banks} method={active} currency={currency} />
        ) : null}

        <aside className="deposit-rule">
          <p className="deposit-rule__title">{t('deposit.ruleTitle')}</p>
          <p className="deposit-rule__line">{t('deposit.ruleApproval')}</p>
          <p className="deposit-rule__line">{t('deposit.ruleFees')}</p>
          <p className="deposit-tnc">{t('deposit.ruleAttention')}</p>
        </aside>
      </div>
    </div>
  );
}

/**
 * Channel cards (`.deposit-banklist__tab`: 144px, a 45px light frame for a logo
 * that is not shipped — a hue placeholder instead).
 */
function ChannelCards({ channels, currency }: { channels: DepositChannel[]; currency: string }) {
  const t = useTranslations('account');
  if (channels.length === 0) return null;

  return (
    <div className="deposit-banklist__wrapper">
      {channels.map((channel) => (
        <div key={channel.id} className="deposit-banklist__tab">
          <span className="deposit-banklist-icon__container" aria-hidden="true">
            <span
              className="deposit-banklist-icon"
              style={{ '--tone': String(channel.tone) } as CSSProperties}
            />
          </span>
          <span className="deposit-banklist__name">{channel.name}</span>
          <span className="deposit-banklist__minmax">
            {t('deposit.minmax', {
              min: formatMinor(channel.minAmountMinor, currency, 'en-MY', { compact: true }),
              max: formatMinor(channel.maxAmountMinor, currency, 'en-MY', { compact: true }),
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One foldable block: open by default, the chevron folds it on every viewport. */
function DepositSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="deposit-collapse">
      <button
        type="button"
        className="deposit-collapse__heading"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} className="deposit-collapse__icon" />
      </button>
      {open ? <div className="deposit-collapse__content">{children}</div> : null}
    </section>
  );
}
