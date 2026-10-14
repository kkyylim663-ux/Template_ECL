import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { DepositForm } from '@/components/account/forms';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DepositPage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">{t('deposit.title')}</h2>
      <p className="text-muted mt-1 text-xs">{t('deposit.intro')}</p>
      <div className="mt-5">
        <DepositForm payload={payload} />
      </div>
    </section>
  );
}
