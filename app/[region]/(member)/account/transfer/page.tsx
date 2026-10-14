import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { TransferForm } from '@/components/account/forms';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TransferPage() {
  const payload = await getAccountPayload();

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">Wallet transfer</h2>
      <p className="text-muted mt-1 text-xs">
        Move money between the main wallet and a provider wallet before launching a title.
      </p>
      <div className="mt-5">
        <TransferForm payload={payload} />
      </div>
    </section>
  );
}
