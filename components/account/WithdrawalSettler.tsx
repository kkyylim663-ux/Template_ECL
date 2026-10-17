'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { walletService } from '@/lib/api/wallet';
import { useSession } from '@/lib/session/useSession';
import { settleWithdrawal, type SettleableRequest } from '@/lib/withdrawal-settle';

/**
 * Settles finished withdrawals once per signed-in account (T59B). It renders
 * nothing; it runs on every account page so a result that landed while the
 * member was elsewhere still reaches history and the inbox on the next visit.
 * The wallet is bound to the account only after the session is ready, so the
 * refund waits for that (the T59A lesson).
 */
export function WithdrawalSettler({ currency }: { currency: string }) {
  const t = useTranslations('account');
  const { ready, member } = useSession();

  useEffect(() => {
    if (!ready || !member) return;
    let cancelled = false;
    (async () => {
      const response = await fetch('/api/withdrawal/requests', { cache: 'no-store' });
      const payload = (await response.json()) as { d?: SettleableRequest[] };
      for (const request of payload.d ?? []) {
        if (cancelled) return;
        await settleWithdrawal(request, {
          at: new Date().toISOString(),
          currency,
          labels: {
            method: request.methodLabel,
            subject: t('withdrawal.settledSubject'),
            body: (amount, reference) =>
              request.status === 'failed'
                ? t('withdrawal.settledFailedBody', { amount, reference })
                : t('withdrawal.settledSuccessBody', { amount, reference }),
          },
          refund: (amountMinor, idempotencyKey) => walletService.deposit(amountMinor, idempotencyKey),
        }).catch(() => undefined);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ready, member, currency, t]);

  return null;
}
