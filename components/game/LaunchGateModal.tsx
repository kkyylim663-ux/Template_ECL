'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Modal, type ModalVariant } from '@/components/ui/Modal';
import { regionPath } from '@/config/nav';
import type { LaunchGate } from '@/lib/game/launch-gate';

/**
 * The reference's launch dictionary, one message per gate: `login_first`,
 * `credit_msg`, `coming_soon_game` and — for a studio the provider registry
 * marks (T62) — `under_maintenance` over `maintenance_msg` (`crawl/js/sdk.js`).
 * The panel itself is the shared modal shell, so Escape, the close icon and the
 * backdrop all dismiss it — the reference only ever shows these as a dialog,
 * never a page.
 */
const COPY: Record<LaunchGate, { variant: ModalVariant; titleKey: string; bodyKey: string }> = {
  login: { variant: 'alert', titleKey: 'launch.loginTitle', bodyKey: 'launch.loginBody' },
  insufficient: { variant: 'alert', titleKey: 'launch.lowTitle', bodyKey: 'launch.lowBody' },
  maintenance: {
    variant: 'alert',
    titleKey: 'card.underMaintenance',
    bodyKey: 'launch.maintenanceBody',
  },
  // The reference has no string for a studio without a Demo action — it simply
  // never renders that action (`tpl-if`), and neither do we; this guard borrows
  // the coming-soon notice for a demo click that arrives from anywhere else.
  'demo-unavailable': { variant: 'status', titleKey: 'launch.soonTitle', bodyKey: 'launch.soonBody' },
  'coming-soon': { variant: 'status', titleKey: 'launch.soonTitle', bodyKey: 'launch.soonBody' },
};

// The action row of the shared modal (ModalProvider's two button styles).
const PRIMARY = 'bg-accent rounded-[8px] px-4 py-2 text-sm font-semibold text-[#1b1b1b]';
const SECONDARY =
  'border-line text-ink hover:border-accent rounded-[8px] border px-4 py-2 text-sm';

export function LaunchGateModal({
  gate,
  region,
  here,
  onClose,
}: {
  gate: LaunchGate;
  region: string;
  /**
   * Where the member was, query string included, so signing in comes back to
   * it. Only the login gate reads it — a studio's own notice (maintenance)
   * needs no session and no address.
   */
  here?: string;
  onClose: () => void;
}) {
  const t = useTranslations('games');
  const tCommon = useTranslations('common');
  const copy = COPY[gate];
  const loginPath = regionPath(region, '/login');
  const loginHref = here ? `${loginPath}?next=${encodeURIComponent(here)}` : loginPath;

  return (
    <Modal
      open
      onClose={onClose}
      variant={copy.variant}
      title={t(copy.titleKey)}
      actions={
        gate === 'login' ? (
          <>
            <Link href={regionPath(region, '/register')} className={SECONDARY}>
              {tCommon('action.register')}
            </Link>
            <Link href={loginHref} className={PRIMARY}>
              {tCommon('action.login')}
            </Link>
          </>
        ) : gate === 'insufficient' ? (
          <Link href={regionPath(region, '/account/deposit')} className={PRIMARY}>
            {tCommon('action.deposit')}
          </Link>
        ) : (
          <button type="button" onClick={onClose} className={PRIMARY}>
            {tCommon('action.close')}
          </button>
        )
      }
    >
      <p>{t(copy.bodyKey)}</p>
    </Modal>
  );
}
