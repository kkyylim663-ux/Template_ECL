'use client';

import { useCallback, useEffect, useState } from 'react';

import { walletService } from '@/lib/api/wallet';

export type SessionState = {
  /** False until the first `/api/mock-auth/session` answer arrives. */
  ready: boolean;
  member: boolean;
  username: string | null;
  /** Main wallet balance in minor units; zero for guests. */
  balanceMinor: number;
  currency: string;
  unread: number;
  refresh: () => Promise<void>;
};

type SessionBody = {
  member: boolean;
  username: string | null;
  balanceMinor: number;
  currency: string;
  unread: number;
};

/** Dispatched on `window` after sign-in or sign-out so every mounted session view re-checks. */
export const SESSION_EVENT = 'brand:session-change';

const SESSION_CHANNEL = 'brand:session';

let channel: BroadcastChannel | null = null;

function sessionChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(SESSION_CHANNEL);
  return channel;
}

/** Tells this tab and every other open tab that the session changed. */
export function notifySessionChange(): void {
  window.dispatchEvent(new Event(SESSION_EVENT));
  sessionChannel()?.postMessage('changed');
}

/** Clears the httpOnly session on the server, then notifies all tabs. */
export async function signOutRequest(): Promise<void> {
  await fetch('/api/mock-auth/logout', { method: 'POST' });
  walletService.reset();
  notifySessionChange();
}

/**
 * Client view of the httpOnly session. The cookie itself is never readable from
 * script; the route handler answers only whether a member is signed in and the
 * header summary numbers.
 *
 * Until the first answer, `member` is false, which matches the server HTML, so
 * a signed-in visitor sees the guest header for a moment and then the member one.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<Omit<SessionState, 'refresh'>>({
    ready: false,
    member: false,
    username: null,
    balanceMinor: 0,
    currency: '',
    unread: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/mock-auth/session', { cache: 'no-store' });
      const body = (await response.json()) as { d: SessionBody };
      // The header shows total assets: the main wallet plus whatever still sits in game wallets.
      if (body.d.member) await walletService.getWallets();
      setState({
        ready: true,
        ...body.d,
        balanceMinor: body.d.member ? walletService.totalMinor() : body.d.balanceMinor,
      });
    } catch {
      setState((current) => ({ ...current, ready: true }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sync = () => void refresh();
    const bus = sessionChannel();
    window.addEventListener(SESSION_EVENT, sync);
    bus?.addEventListener('message', sync);
    const offWallet = walletService.subscribe(sync);
    return () => {
      offWallet();
      window.removeEventListener(SESSION_EVENT, sync);
      bus?.removeEventListener('message', sync);
    };
  }, [refresh]);

  return { ...state, refresh };
}
