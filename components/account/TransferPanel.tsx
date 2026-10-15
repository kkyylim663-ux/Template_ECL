'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { useModal } from '@/components/ui/ModalProvider';

type WalletOption = { code: string; name: string; balance: string; available: boolean };

/**
 * The transfer page body: the reference's 596px form card (From / To /
 * Transfer Amount with a Max chip and the available balance beside it) plus the
 * 397px card on the right that holds the automatic-credit switch and the game
 * wallet list. Submitting opens the demo dialog — nothing is posted.
 */
export function TransferPanel({
  wallets,
  initialFrom,
  initialTo,
  currency,
}: {
  wallets: WalletOption[];
  initialFrom: string;
  initialTo: string;
  currency: string;
}) {
  const t = useTranslations('account');
  const modal = useModal();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState('');
  const [autoCredit, setAutoCredit] = useState(true);

  const fromWallet = wallets.find((wallet) => wallet.code === from);
  const available = fromWallet ? fromWallet.balance : '0.00';

  return (
    <div className="transfer-container myTransferContainer has-space">
      <div className="account-content__container transfer-left">
        <h1 className="form-title history-title">{t('transfer.title')}</h1>
        <form
          id="transferForm"
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            modal.success(t('transfer.demoTitle'), t('transfer.demoBody'));
          }}
        >
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
                    onChange={(event) => setAmount(event.target.value)}
                  />
                  <button
                    type="button"
                    className="form-control__icon-wrapper maxbutton"
                    onClick={() => setAmount(available.replace(/,/g, ''))}
                  >
                    {t('transfer.max')}
                  </button>
                </div>
                <div className="form-group__side-input__text">
                  <div>{t('transfer.available')}</div>
                  <div id="availableFund">{available}</div>
                </div>
              </div>
              <div className="form-error" />
            </div>
          </div>
          <button className="btn btn-primary transfer-submit__btn width-medium" type="submit">
            {t('transfer.submitLabel')}
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
                {currency} {wallet.balance}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
