import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { WithdrawalForm } from '@/components/account/forms';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.withdrawal'), robots: { index: false, follow: false } };
}

export default async function WithdrawalPage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">{t('withdrawal.title')}</h2>
      <p className="text-muted mt-1 text-xs">{t('withdrawal.intro')}</p>

      <ul className="mt-3 space-y-1 text-xs">
        {payload.bankAccounts.map((account) => (
          <li key={account.id} className="text-muted">
            <span className="text-ink font-mono">{account.bankId.toUpperCase()}</span>{' '}
            {account.accountNumberMasked} ·{' '}
            {account.verified
              ? t('withdrawal.accountVerified')
              : t('withdrawal.accountPending')}
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <WithdrawalForm payload={payload} />
      </div>
    </section>
  );
}
