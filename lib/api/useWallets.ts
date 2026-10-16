'use client';

import { useEffect, useState } from 'react';
import { walletService, type Wallet } from './wallet';

export interface WalletsView {
  ready: boolean;
  wallets: Wallet[];
  /** Spendable balance: the main wallet only. */
  mainMinor: number;
  /** main + every game wallet. */
  totalMinor: number;
}

/**
 * The single client-side source for every balance on screen. The header, the
 * account card, the wallet list and the forms all read this, so two places can
 * never show two different numbers.
 */
export function useWallets(): WalletsView {
  const [view, setView] = useState<WalletsView>({
    ready: false,
    wallets: [],
    mainMinor: 0,
    totalMinor: 0,
  });

  useEffect(() => {
    let alive = true;
    const read = async () => {
      const wallets = await walletService.getWallets();
      if (!alive) return;
      setView({
        ready: true,
        wallets,
        mainMinor: wallets.find((wallet) => wallet.kind === 'main')?.amountMinor ?? 0,
        totalMinor: walletService.totalMinor(),
      });
    };
    void read();
    const off = walletService.subscribe(() => void read());
    return () => {
      alive = false;
      off();
    };
  }, []);

  return view;
}
