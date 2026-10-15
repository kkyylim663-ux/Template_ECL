import { formatMinor } from '@/lib/format';
import type { AccountPayload } from '@/lib/api/schemas';
import { getT } from '@/lib/i18n/server';
import type { RegionCode } from '@/config/brand';
import { regionConfig } from '@/config/brand';

/**
 * Balance strip above every member page: main wallet plus each provider wallet.
 * Renders from the account payload; nothing here posts anything.
 */
export async function BalanceBar({ payload, region }: { payload: AccountPayload; region: RegionCode }) {
  const { t } = await getT('account');
  const total = payload.wallets.reduce((sum, wallet) => sum + wallet.amountMinor, 0);
  // Currency follows the market, not the language. */
  const currency = regionConfig(region).currency;

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-muted text-11 tracking-widest uppercase">{t('totalBalance')}</p>
        <p className="text-accent font-mono text-lg font-semibold">
          {formatMinor(total, currency)}
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {payload.wallets.map((wallet) => (
          <li
            key={wallet.code}
            data-wallet={wallet.code}
            className={`border-line bg-panel-soft flex items-center gap-2 rounded-[var(--radius-tag)] border px-3 py-1.5 text-xs ${
              wallet.available ? '' : 'opacity-55'
            }`}
          >
            <span className="text-muted">{wallet.name}</span>
            <span className="text-ink font-mono">
              {formatMinor(wallet.amountMinor, currency)}
            </span>
            {wallet.available ? null : (
              <span className="text-danger text-10">{t('walletOffline')}</span>
            )}
          </li>
        ))}
      </ul>

      <p className="text-muted mt-3 text-11">{t('demoBalances')}</p>
    </section>
  );
}
