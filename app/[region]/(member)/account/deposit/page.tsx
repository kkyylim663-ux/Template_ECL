import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { DepositForm } from '@/components/account/forms';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DepositPage() {
  const payload = await getAccountPayload();

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">Deposit</h2>
      <p className="text-muted mt-1 text-xs">
        Bank transfer or payment gateway. Both stop at validation in this build.
      </p>
      <div className="mt-5">
        <DepositForm payload={payload} />
      </div>
    </section>
  );
}
