'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { useModal } from '@/components/ui/ModalProvider';
import { formatMinor, parseAmountMinor } from '@/lib/format';
import { walletService, WalletError, type Wallet } from '@/lib/api/wallet';
import { notifySessionChange } from '@/lib/session/useSession';

const QUICK_AMOUNTS_MINOR = [5000, 10000, 50000];

type LoadState = 'loading' | 'error' | 'empty' | 'ready';
type ErrorKey = 'amountInvalid' | 'sameWallet' | 'insufficient' | 'unavailable' | 'failed';

function minorToInput(amountMinor: number): string {
  return `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, '0')}`;
}

const ERROR_KEYS: Record<WalletError['code'] | 'failed', ErrorKey> = {
  invalid_amount: 'amountInvalid',
  same_wallet: 'sameWallet',
  insufficient: 'insufficient',
  unavailable: 'unavailable',
  unknown_wallet: 'failed',
  network: 'failed',
  failed: 'failed',
};

function errorKeyOf(error: unknown): ErrorKey {
  return ERROR_KEYS[error instanceof WalletError ? error.code : 'failed'];
}

/**
 * The transfer page body: the reference's 596px form card (From / To / Transfer
 * Amount with a Max chip and the available balance beside it) plus the 397px
 * card with the automatic-credit switch and the wallet list. Balances come from
 * the mock wallet service, so a successful transfer updates this card and the
 * header together.
 */
export function TransferPanel({ currency }: { currency: string }) {
  const t = useTranslations('account');
  const modal = useModal();
  const [state, setState] = useState<LoadState>('loading');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoCredit, setAutoCredit] = useState(true);
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const list = await walletService.getWallets();
      setWallets(list);
      const main = list.find((wallet) => wallet.kind === 'main') ?? list[0];
      if (!main) {
        setState('empty');
        return;
      }
      const game = list.find((wallet) => wallet.kind === 'game' && wallet.code !== main.code);
      setFrom((current) => current || main.code);
      setTo((current) => current || game?.code || main.code);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const walletByCode = (code: string) => wallets.find((wallet) => wallet.code === code);
  const nameOf = (code: string) => walletByCode(code)?.name ?? code;
  const available = walletByCode(from)?.amountMinor ?? 0;
  const availableText = formatMinor(available, currency);

  async function refreshWallets() {
    setWallets(await walletService.getWallets());
    notifySessionChange();
  }

  async function runTransfer(source: string, target: string, amountMinor: number) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await walletService.transfer(source, target, amountMinor);
      setAmount('');
      await refreshWallets();
      modal.success(
        t('transfer.successTitle'),
        t('transfer.successBody', {
          amount: formatMinor(amountMinor, currency),
          from: nameOf(source),
          to: nameOf(target),
        }),
      );
    } catch (error) {
      modal.error(t('transfer.failedTitle'), t(`transfer.${errorKeyOf(error)}`));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function runTransferAll(target: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const receipts = await walletService.transferAll(target);
      await refreshWallets();
      if (receipts.length === 0) {
        modal.success(t('transfer.successTitle'), t('transfer.allNone'));
      } else {
        modal.success(
          t('transfer.successTitle'),
          t('transfer.allSuccessBody', { count: receipts.length, to: nameOf(target) }),
        );
      }
    } catch (error) {
      modal.error(t('transfer.failedTitle'), t(`transfer.${errorKeyOf(error)}`));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const amountMinor = parseAmountMinor(amount);
    const problem: ErrorKey | null =
      from === to
        ? 'sameWallet'
        : amountMinor === null || amountMinor <= 0
          ? 'amountInvalid'
          : amountMinor > available
            ? 'insufficient'
            : walletByCode(to)?.available === false || walletByCode(from)?.available === false
              ? 'unavailable'
              : null;
    setFormError(problem);
    if (problem || amountMinor === null) return;
    const source = from;
    const target = to;
    modal.confirm(
      t('transfer.confirmTitle'),
      t('transfer.confirmBody', {
        amount: formatMinor(amountMinor, currency),
        from: nameOf(source),
        to: nameOf(target),
      }),
      () => void runTransfer(source, target, amountMinor),
      t('transfer.confirmAction'),
    );
  }

  function handleTransferAll() {
    if (submittingRef.current) return;
    const target = to;
    modal.confirm(
      t('transfer.confirmTitle'),
      t('transfer.allConfirmBody', { to: nameOf(target) }),
      () => void runTransferAll(target),
      t('transfer.confirmAction'),
    );
  }

  if (state === 'loading') {
    return (
      <div className="transfer-container myTransferContainer has-space">
        <div className="account-content__container transfer-left" role="status">
          <h1 className="form-title history-title">{t('transfer.title')}</h1>
          <p className="mt-5">{t('transfer.loading')}</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="transfer-container myTransferContainer has-space">
        <div className="account-content__container transfer-left" role="alert">
          <h1 className="form-title history-title">{t('transfer.title')}</h1>
          <p className="mt-5">{t('transfer.loadFailed')}</p>
          <button type="button" className="btn btn-primary mt-5" onClick={() => void load()}>
            {t('transfer.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="transfer-container myTransferContainer has-space">
        <div className="account-content__container transfer-left">
          <h1 className="form-title history-title">{t('transfer.title')}</h1>
          <p className="mt-5">{t('transfer.empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transfer-container myTransferContainer has-space">
      <div className="account-content__container transfer-left">
        <h1 className="form-title history-title">{t('transfer.title')}</h1>
        <form id="transferForm" className="mt-5" onSubmit={handleSubmit} noValidate>
          <div className="width-medium ss">
            <div className="form-group">
              <label htmlFor="t_from">{t('transfer.from')}</label>
              <div className="relative">
                <select
                  id="t_from"
                  className="form-control form-control-select"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.code} value={wallet.code}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
                <span className="form-control-dropdown icon-dropdown">
                  <Icon name="chevronDown" size={16} className="text-muted" />
                </span>
              </div>
              <div className="form-error s" />
            </div>

            <div className="form-group">
              <label htmlFor="t_to">{t('transfer.to')}</label>
              <div className="relative">
                <select
                  id="t_to"
                  className="form-control form-control-select"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.code} value={wallet.code}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
                <span className="form-control-dropdown icon-dropdown">
                  <Icon name="chevronDown" size={16} className="text-muted" />
                </span>
              </div>
              <div className="form-error" />
            </div>

            <div className="form-group">
              <label htmlFor="t_amount">{t('transfer.amountWithCurrency', { currency })}</label>
              <div className="form-group__side-input-wrapper">
                <div className="relative">
                  <input
                    id="t_amount"
                    name="t_amount"
                    inputMode="decimal"
                    className="form-control"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setFormError(null);
                    }}
                  />
                  <button
                    type="button"
                    className="form-control__icon-wrapper maxbutton"
                    onClick={() => setAmount(minorToInput(available))}
                  >
                    {t('transfer.max')}
                  </button>
                </div>
                <div className="form-group__side-input__text">
                  <div>{t('transfer.available')}</div>
                  <div id="availableFund">{availableText}</div>
                </div>
              </div>
              <div className="form-error" role="alert">
                {formError ? t(`transfer.${formError}`) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS_MINOR.map((minor) => (
                <button
                  key={minor}
                  type="button"
                  className="btn"
                  onClick={() => setAmount(minorToInput(minor))}
                >
                  {formatMinor(minor, currency, 'en-MY', { compact: true })}
                </button>
              ))}
            </div>
            <p className="mt-2 text-muted">{t('transfer.minHint', { min: formatMinor(1, currency) })}</p>
          </div>
          <button
            className="btn btn-primary transfer-submit__btn width-medium"
            type="submit"
            disabled={submitting}
          >
            {t('transfer.submitLabel')}
          </button>
          <button
            type="button"
            className="btn transfer-submit__btn width-medium mt-3"
            disabled={submitting}
            onClick={handleTransferAll}
          >
            {t('transfer.all')}
          </button>
        </form>
      </div>

      <div className="account-content__container transfer-right">
        <div className="auto-transfer__wrapper">
          <div className="auto-transfer__title">{t('transfer.autoCredit')}</div>
          <label className="switch">
            <input
              type="checkbox"
              checked={autoCredit}
              onChange={(event) => setAutoCredit(event.target.checked)}
            />
            <span className="slider round" />
          </label>
        </div>
        <ul className="transfer-credit__list">
          {wallets.map((wallet) => (
            <li key={wallet.code} className="transfer-credit__row">
              <Icon name="wallet" size={20} className="text-muted" />
              {wallet.name}
              <span className="transfer-credit__balance">
                {formatMinor(wallet.amountMinor, currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
