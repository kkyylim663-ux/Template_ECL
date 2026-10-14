import { formatMinor } from '@/lib/format';
import type { AccountPayload } from '@/lib/api/schemas';

/**
 * Balance strip above every member page: main wallet plus each provider wallet.
 * Renders from the account payload; nothing here posts anything.
 */
export function BalanceBar({ payload }: { payload: AccountPayload }) {
  const total = payload.wallets.reduce((sum, wallet) => sum + wallet.amountMinor, 0);
  const currency = 'MYR';

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-muted text-[11px] tracking-widest uppercase">Total balance</p>
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
            {wallet.available ? null : <span className="text-danger text-[10px]">offline</span>}
          </li>
        ))}
      </ul>

      <p className="text-muted mt-3 text-[11px]">
        Demo balances — the account pages below are placeholders and move no money.
      </p>
    </section>
  );
}
