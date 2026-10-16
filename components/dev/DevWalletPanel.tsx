'use client';

// MOCK-ONLY: 演示用钱包模拟器面板（充值/提现/转账 + 流水 + 不变量）。接后台后可删。

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { parseAmountMinor } from '@/lib/format';
import { walletService, WalletError, type LedgerEntry, type Wallet } from '@/lib/api/wallet';

const CURRENCY = 'MYR';

const money = (minor: number) => `${CURRENCY} ${(minor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

/**
 * The mock-only wallet simulator (T45 supplement). It drives the same
 * `walletService` the member pages use, so a deposit here moves the header
 * balance there; the ledger it lists is what the invariant is checked against:
 * `total = seed + Σ deposits − Σ withdrawals` (transfers are neutral).
 */
export function DevWalletPanel() {
  const t = useTranslations('account');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('main');
  const [to, setTo] = useState('pragmatic');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const list = await walletService.getWallets();
    setWallets(list);
    setLedger(walletService.ledger());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const total = wallets.reduce((sum, wallet) => sum + wallet.amountMinor, 0);
  const deposits = ledger.filter((entry) => entry.kind === 'deposit').reduce((sum, entry) => sum + entry.amountMinor, 0);
  const withdrawals = ledger.filter((entry) => entry.kind === 'withdraw').reduce((sum, entry) => sum + entry.amountMinor, 0);
  const expected = walletService.seedTotalMinor() + deposits - withdrawals;
  const holds = expected === total;

  const parsed = parseAmountMinor(amount);

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof WalletError && caught.code === 'insufficient'
          ? t('transfer.insufficient')
          : caught instanceof WalletError && caught.code === 'invalid_amount'
            ? t('transfer.amountInvalid')
            : t('transfer.failed'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dev-wallet">
      <h1 className="text-ink text-xl font-semibold">{t('dev.wallet.title')}</h1>
      <p className="text-muted text-xs">{t('dev.wallet.intro')}</p>

      <section className="dev-wallet-summary">
        <table className="table-theme">
          <thead>
            <tr>
              <th>{t('transfer.from')}</th>
              <th>{t('transfer.available')}</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((wallet) => (
              <tr key={wallet.code} data-wallet={wallet.code}>
                <td>{wallet.name}</td>
                <td className="dev-wallet-balance">{money(wallet.amountMinor)}</td>
              </tr>
            ))}
            <tr>
              <td>{t('dev.wallet.total')}</td>
              <td className="dev-wallet-total">{money(total)}</td>
            </tr>
          </tbody>
        </table>

        <p className="dev-wallet-check text-xs" data-holds={holds ? 'true' : 'false'}>
          {t('dev.wallet.initial')} {money(walletService.seedTotalMinor())} + {t('dev.wallet.deposits')}{' '}
          {money(deposits)} − {t('dev.wallet.withdrawals')} {money(withdrawals)} = {money(expected)} ·{' '}
          <strong>{holds ? t('dev.wallet.checkHolds') : t('dev.wallet.checkBroken')}</strong>
        </p>
      </section>

      <section className="dev-wallet-actions">
        <div className="dev-wallet-action" id="dev-deposit">
          <label htmlFor="dev-deposit-amount">{t('dev.wallet.deposit')}</label>
          <input
            id="dev-deposit-amount"
            className="form-control"
            inputMode="decimal"
            aria-label={t('dev.wallet.amount')}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || parsed === null}
            onClick={() => void run(() => walletService.deposit(parsed ?? 0))}
          >
            {t('dev.wallet.deposit')}
          </button>
        </div>

        <div className="dev-wallet-action" id="dev-withdraw">
          <label htmlFor="dev-withdraw-amount">{t('dev.wallet.withdraw')}</label>
          <input
            id="dev-withdraw-amount"
            className="form-control"
            inputMode="decimal"
            aria-label={t('dev.wallet.amount')}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <button
            type="button"
            className="btn"
            disabled={busy || parsed === null}
            onClick={() => void run(() => walletService.withdraw(parsed ?? 0))}
          >
            {t('dev.wallet.withdraw')}
          </button>
        </div>

        <div className="dev-wallet-action" id="dev-transfer">
          <label htmlFor="dev-transfer-from">{t('dev.wallet.transfer')}</label>
          <select
            id="dev-transfer-from"
            className="form-control"
            aria-label={t('dev.wallet.from')}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          >
            {wallets.map((wallet) => (
              <option key={wallet.code} value={wallet.code}>
                {wallet.name}
              </option>
            ))}
          </select>
          <select
            className="form-control"
            aria-label={t('dev.wallet.to')}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          >
            {wallets.map((wallet) => (
              <option key={wallet.code} value={wallet.code}>
                {wallet.name}
              </option>
            ))}
          </select>
          <input
            className="form-control"
            inputMode="decimal"
            aria-label={t('dev.wallet.amount')}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <button
            type="button"
            className="btn"
            disabled={busy || parsed === null}
            onClick={() => void run(() => walletService.transfer(from, to, parsed ?? 0))}
          >
            {t('dev.wallet.transfer')}
          </button>
        </div>

        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => void run(async () => walletService.reset())}
        >
          {t('dev.wallet.reset')}
        </button>
      </section>

      {error ? (
        <p className="dev-wallet-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="dev-wallet-ledger">
        <h2 className="text-ink text-sm font-semibold">{t('dev.wallet.ledger')}</h2>
        {ledger.length === 0 ? (
          <p className="text-muted text-xs">{t('dev.wallet.empty')}</p>
        ) : (
          <table className="table-theme">
            <thead>
              <tr>
                <th>{t('history.type')}</th>
                <th>{t('dev.wallet.amount')}</th>
                <th>{t('dev.wallet.from')}</th>
                <th>{t('dev.wallet.to')}</th>
                <th>{t('history.col.clock')}</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="dev-ledger-row" data-kind={entry.kind}>
                  <td>{t(`dev.wallet.kind.${entry.kind}`)}</td>
                  <td>{money(entry.amountMinor)}</td>
                  <td>{entry.from ?? '–'}</td>
                  <td>{entry.to ?? '–'}</td>
                  <td>{entry.at.slice(11, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
