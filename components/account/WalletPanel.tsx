'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';
import { useModal } from '@/components/ui/ModalProvider';
import { formatMinorPlain } from '@/lib/format';
import { walletService, WalletError, type Wallet } from '@/lib/api/wallet';
import { useWallets } from '@/lib/api/useWallets';
import { notifySessionChange } from '@/lib/session/useSession';

const MAIN = 'main';

type Direction = 'out' | 'in';

/** The reference's `.mobile-nav` pills over the finance pages (mobile only). */
const TABS = [
  { href: '/account/wallet', key: 'tabWallet' },
  { href: '/account/deposit', key: 'tabDeposit' },
  { href: '/account/withdrawal', key: 'tabWithdrawal' },
  { href: '/account/transfer', key: 'tabTransfer' },
  { href: '/account/history', key: 'tabHistory' },
] as const;

/** Wallet-move failures reuse the transfer page's vocabulary. */
const MOVE_ERRORS: Partial<Record<WalletError['code'], 'insufficient' | 'unavailable'>> = {
  insufficient: 'insufficient',
  unavailable: 'unavailable',
};

/**
 * The wallet page — what the reference's dock opens (`/my/mywallet`, probed
 * live 2026-10-18): the `.mobile-nav` finance pill row, the Total Balance strip
 * with Transfer All, the automatic-credit switch, the `.walletBalance` block
 * (Main Wallet card, one row per game wallet with OUT / IN, the total row and
 * the green "transfer all to Main Wallet" button), then the tickets row. The
 * reference's OUT / IN are the entry points into its transfer dialog; this mock
 * moves the whole source balance after a confirm. Balances come from the shared
 * mock wallet service, so this page and the header always agree.
 */
export function WalletPanel({
  region,
  currency,
  ticketCount,
}: {
  region: string;
  currency: string;
  ticketCount: number;
}) {
  const t = useTranslations('account');
  const modal = useModal();
  const [autoCredit, setAutoCredit] = useState(true);
  const busyRef = useRef(false);
  // The shared client-side balance source (header, account card, wallet list):
  // it rebinds when the session settles, so the rows never keep the guest
  // wallet set's zeroed game balances.
  const { ready, wallets, totalMinor } = useWallets();

  const main = wallets.find((wallet) => wallet.kind === 'main');
  const others = wallets.filter((wallet) => wallet.kind === 'game');
  const total = totalMinor;

  /** The header re-reads on this event; the panel itself follows the service. */
  function refresh() {
    notifySessionChange();
  }

  async function runMove(source: Wallet, target: Wallet, amountMinor: number) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await walletService.transfer(source.code, target.code, amountMinor);
      refresh();
      modal.success(
        t('transfer.successTitle'),
        t('transfer.successBody', {
          amount: formatMinorPlain(amountMinor),
          from: source.name,
          to: target.name,
        }),
      );
    } catch (error) {
      const key = error instanceof WalletError ? (MOVE_ERRORS[error.code] ?? 'failed') : 'failed';
      modal.error(t('transfer.failedTitle'), t(`transfer.${key}`));
    } finally {
      busyRef.current = false;
    }
  }

  function move(wallet: Wallet, direction: Direction) {
    if (!main) return;
    const source = direction === 'out' ? wallet : main;
    const target = direction === 'out' ? main : wallet;
    const amountMinor = source.amountMinor;
    if (amountMinor <= 0) {
      modal.success(t('transfer.failedTitle'), t('wallet.emptyMove'));
      return;
    }
    const body =
      direction === 'out'
        ? t('wallet.outConfirmBody', { amount: formatMinorPlain(amountMinor), wallet: wallet.name })
        : t('wallet.inConfirmBody', { amount: formatMinorPlain(amountMinor), wallet: wallet.name });
    modal.confirm(
      direction === 'out' ? t('wallet.outConfirmTitle') : t('wallet.inConfirmTitle'),
      body,
      () => void runMove(source, target, amountMinor),
      t('wallet.moveConfirm'),
    );
  }

  async function runTransferAll() {
    if (busyRef.current || !main) return;
    busyRef.current = true;
    try {
      const skipped = walletService.skippedByMaintenance(main.code);
      const receipts = await walletService.transferAll(main.code);
      refresh();
      if (skipped.length > 0) {
        modal.success(
          t('transfer.successTitle'),
          t('transfer.allPartialBody', {
            count: receipts.length,
            to: main.name,
            skipped: skipped
              .map((wallet) => `${wallet.name} ${formatMinorPlain(wallet.amountMinor)}`)
              .join(', '),
          }),
        );
      } else if (receipts.length === 0) {
        modal.success(t('transfer.successTitle'), t('transfer.allNone'));
      } else {
        modal.success(
          t('transfer.successTitle'),
          t('transfer.allSuccessBody', { count: receipts.length, to: main.name }),
        );
      }
    } catch {
      modal.error(t('transfer.failedTitle'), t('transfer.failed'));
    } finally {
      busyRef.current = false;
    }
  }

  function confirmTransferAll() {
    modal.confirm(
      t('transfer.allConfirmTitle'),
      t('transfer.allConfirmBody'),
      () => void runTransferAll(),
      t('transfer.allConfirmYes'),
      t('transfer.allConfirmNo'),
    );
  }

  if (!ready) {
    return (
      <div className="account-content__container" role="status">
        <p>{t('wallet.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <nav className="mobile-nav__link-wrapper desktop:hidden" aria-label={t('wallet.tabLabel')}>
        <div className="mobile-nav__link-container">
          {TABS.map((tab) => {
            const selected = tab.href === '/account/wallet';
            return (
              <Link
                key={tab.href}
                href={regionPath(region, tab.href)}
                className={`mobile-nav__link${selected ? ' selected' : ''}`}
                aria-current={selected ? 'page' : undefined}
              >
                {t(`wallet.${tab.key}`)}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mobile-banking-header">
        <p className="mobile-banking-header__title">{t('wallet.totalBalance')}</p>
        <div className="mobile-banking-header__row">
          <span className="mobile-banking-header__balance">
            {currency}
            {formatMinorPlain(total)}
          </span>
          <button
            type="button"
            className="wallet-balance__refresh"
            aria-label={t('wallet.refresh')}
            onClick={() => void refresh()}
          >
            <Icon name="refresh" size={16} />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-small mobile-banking-header__action"
            onClick={confirmTransferAll}
          >
            {t('wallet.transferAll')}
          </button>
        </div>
      </div>

      <div className="myTransferContainer">
        <div className="auto-transfer__wrapper">
          <div className="auto-transfer__title">{t('transfer.autoCredit')}</div>
          <label className="switch">
            <input
              type="checkbox"
              aria-label={t('transfer.autoCredit')}
              checked={autoCredit}
              onChange={(event) => setAutoCredit(event.target.checked)}
            />
            <span className="slider round" />
          </label>
        </div>

        {others.length > 0 ? (
          <div className="walletBalance">
            <div className="header">
              <p className="walletTitle">{t('wallet.mainWallet')}</p>
              <div className="mainWalletBalance">
                <span className="currency">{currency}</span>
                <span className="amount">{formatMinorPlain(main?.amountMinor ?? 0)}</span>
              </div>
            </div>

            <div className="content">
              {others.map((wallet) => (
                <div key={wallet.code} className="wallet">
                  <p className="walletName">{wallet.name}</p>
                  <div className="details">
                    <span className="balance">{formatMinorPlain(wallet.amountMinor)}</span>
                    <button
                      type="button"
                      className="out"
                      disabled={!wallet.available}
                      aria-label={`${t('wallet.out')}: ${t('wallet.outLabel', { wallet: wallet.name })}`}
                      onClick={() => move(wallet, 'out')}
                    >
                      {t('wallet.out')}
                    </button>
                    <button
                      type="button"
                      className="in"
                      disabled={!wallet.available}
                      aria-label={`${t('wallet.in')}: ${t('wallet.inLabel', { wallet: wallet.name })}`}
                      onClick={() => move(wallet, 'in')}
                    >
                      {t('wallet.in')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="totalBanlance">
              <p className="total">{t('wallet.totalAssets')}</p>
              <p className="balance">
                {currency}
                {formatMinorPlain(total)}
              </p>
            </div>

            <button type="button" className="transferAllBalanceToMain" onClick={confirmTransferAll}>
              {t('wallet.transferAllToMain')}
            </button>
          </div>
        ) : null}
      </div>

      <div className="wallet-ticket__wrapper">
        <div className="wallet-ticket--left__wrapper">
          <Icon name="ticket" size={18} className="wallet-ticket--left__icon" />
          <span className="wallet-ticket--left__ticket">{t('wallet.tickets')}</span>
        </div>
        <span className="wallet-ticket__number">{ticketCount}</span>
        <Link href={regionPath(region, '/account/tickets')} className="wallet-ticket--go">
          {t('wallet.ticketsGo')}
        </Link>
      </div>
    </>
  );
}
