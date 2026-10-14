import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { ClaimButton } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };
const CURRENCY = 'MYR';
const money = (amountMinor: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 }).format(
    amountMinor / 100,
  );

export default async function RebatesPage() {
  const payload = await getAccountPayload();

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">Rebates</h2>
      <p className="text-muted mt-1 text-xs">No turnover requirement on rebates.</p>

      <div className="border-line mt-4 overflow-x-auto rounded-[var(--radius-panel)] border">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-alt text-muted text-[11px] tracking-wide uppercase">
            <tr>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Turnover</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {payload.rebates.map((rebate) => (
              <tr key={rebate.id} className="border-line border-t">
                <td className="text-ink px-4 py-3 font-mono text-xs">{rebate.period}</td>
                <td className="text-muted px-4 py-3 text-xs">{rebate.product}</td>
                <td className="text-muted px-4 py-3 text-right font-mono text-xs">
                  {money(rebate.turnoverMinor)}
                </td>
                <td className="text-muted px-4 py-3 text-right font-mono text-xs">{rebate.ratePct}%</td>
                <td className="text-accent px-4 py-3 text-right font-mono text-xs">
                  {money(rebate.amountMinor)}
                </td>
                <td className="px-4 py-3 text-xs capitalize">{rebate.status}</td>
                <td className="px-4 py-3 text-right">
                  {rebate.status === 'claimable' ? (
                    <ClaimButton
                      amount={money(rebate.amountMinor)}
                      what={`The ${rebate.product} rebate`}
                    />
                  ) : (
                    <span className="text-muted text-[11px]">{rebate.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
