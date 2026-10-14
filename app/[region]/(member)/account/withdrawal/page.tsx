import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { WithdrawalForm } from '@/components/account/forms';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function WithdrawalPage() {
  const payload = await getAccountPayload();

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">Withdrawal</h2>
      <p className="text-muted mt-1 text-xs">
        The first withdrawal each month carries no fee; later ones do.
      </p>

      <ul className="mt-3 space-y-1 text-xs">
        {payload.bankAccounts.map((account) => (
          <li key={account.id} className="text-muted">
            <span className="text-ink font-mono">{account.bankId.toUpperCase()}</span>{' '}
            {account.accountNumberMasked} · {account.verified ? 'verified' : 'document check pending'}
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <WithdrawalForm payload={payload} />
      </div>
    </section>
  );
}
