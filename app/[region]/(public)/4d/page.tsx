import type { Metadata } from 'next';
import { getLotteryResults } from '@/lib/api';
import { InfoRule } from '@/components/event/InfoRule';
import { LotteryResultCards } from '@/components/event/LotteryResultCards';
import { InertLink } from '@/components/ui/InertLink';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('game4d', { region, path: '/4d' });
}

/**
 * 4D, in the reference build's order (`crawl/pages/my_4d.html`): banner,
 * `form-title` with the page icon, then `.lottery-wrapper` holding the Payout
 * pair of tables, the seven operator result cards and the rule panel. `?book=`
 * picks which card the mobile tab strip shows; on desktop all seven stay up.
 */
export default async function FourDPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const [{ t }, lottery] = await Promise.all([getT('games'), getLotteryResults()]);

  const requested = typeof query.book === 'string' ? query.book : '';
  const activeId =
    lottery.books.find((book) => book.id === requested)?.id ?? lottery.books[0]?.id ?? '';

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <section data-part="banner-section" aria-hidden className="page-hero game-placeholder h-40 max-desktop:h-28" />

        <h1 className="page-title has-space">
          <span aria-hidden className="page-title__icon game-placeholder" />
          {t('fourD.title')}
        </h1>

        <div className="lottery-wrapper">
          <div className="lottery-header">
            <h2 className="section-title">{t('fourD.payout')}</h2>
            <InertLink className="btn btn-primary">{t('fourD.betNow')}</InertLink>
          </div>

          <div className="lottery-info">
            {lottery.payout.map((table) => (
              <div key={table.id} className="lottery-info__card">
                <div className="lottery-info__title">{table.title}</div>
                <p className={`lottery-info__desc desc-${table.id === 'big' ? '1' : '2'}`}>
                  {table.desc}
                </p>
                <table
                  className={`table-theme lottery-info__table-${table.id === 'big' ? '1' : '2'}`}
                >
                  <thead>
                    <tr>
                      <th>{table.head[0]}</th>
                      <th>{table.head[1]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <h2 className="section-title">{t('fourD.result')}</h2>
          <LotteryResultCards books={lottery.books} region={region} activeId={activeId} />

          <div className="has-space w-90">
            <div className="info-rule__wrapper">
              <InfoRule title={t('fourD.rulesTitle')}>
                <ul className="info-rule__list">
                  {lottery.rules.items.map((item) => (
                    <li key={item.title ?? item.body}>
                      {item.title ? (
                        <div className="info-rule__item-title">{item.title}</div>
                      ) : null}
                      <p>{item.body}</p>
                    </li>
                  ))}
                </ul>
              </InfoRule>
            </div>
          </div>
        </div>
      </div>
    </IntlScope>
  );
}
