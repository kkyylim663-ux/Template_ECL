import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { ClaimButton } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };
const money = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    amountMinor / 100,
  );

export default async function RebatesPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);
  const currency = regionConfig(region as RegionCode).currency;

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">{t('rebates.title')}</h2>
      <p className="text-muted mt-1 text-xs">{t('rebates.noRequirement')}</p>

      <div className="border-line mt-4 overflow-x-auto rounded-[var(--radius-panel)] border">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-alt text-muted text-[11px] tracking-wide uppercase">
            <tr>
              <th className="px-4 py-3">{t('rebates.period')}</th>
              <th className="px-4 py-3">{t('rebates.product')}</th>
              <th className="px-4 py-3 text-right">{t('rebates.turnover')}</th>
              <th className="px-4 py-3 text-right">{t('rebates.rate')}</th>
              <th className="px-4 py-3 text-right">{t('history.amount')}</th>
              <th className="px-4 py-3">{t('history.status')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {payload.rebates.map((rebate) => (
              <tr key={rebate.id} className="border-line border-t">
                <td className="text-ink px-4 py-3 font-mono text-xs">{rebate.period}</td>
                <td className="text-muted px-4 py-3 text-xs">{rebate.product}</td>
                <td className="text-muted px-4 py-3 text-right font-mono text-xs">
                  {money(rebate.turnoverMinor, currency)}
                </td>
                <td className="text-muted px-4 py-3 text-right font-mono text-xs">{rebate.ratePct}%</td>
                <td className="text-accent px-4 py-3 text-right font-mono text-xs">
                  {money(rebate.amountMinor, currency)}
                </td>
                <td className="px-4 py-3 text-xs">{t(`rebates.${rebate.status}`)}</td>
                <td className="px-4 py-3 text-right">
                  {rebate.status === 'claimable' ? (
                    <ClaimButton
                      amount={money(rebate.amountMinor, currency)}
                      what={t('rebates.what', { product: rebate.product })}
                    />
                  ) : (
                    <span className="text-muted text-[11px]">{t(`rebates.${rebate.status}`)}</span>
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
