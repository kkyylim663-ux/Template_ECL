import type { Metadata } from 'next';
import { getVipLevels, getVipPrivileges, getVipRules } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { IntlScope } from '@/lib/i18n/scope';
import { JsonLd } from '@/components/content/JsonLd';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { brand } from '@/config/brand';
import { Icon, type IconName } from '@/components/ui/Icon';
import { InfoRuleToggle } from '@/components/content/InfoRuleToggle';
import { Markdown } from '@/components/content/Markdown';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('vip', { region, path: '/vip' });
}

/** The reference ships one SVG per privilege group; this set stands in for them. */
const GROUP_ICONS: Record<string, IconName> = {
  membership: 'crown',
  rebate: 'rebate',
  bonus: 'gift',
  withdrawal: 'withdraw',
};

/** The reference tints the word "VIP" green at the front of the top-tier values. */
function privilegeValue(value: string) {
  if (!value.startsWith('VIP ')) return <p>{value}</p>;
  return (
    <p>
      <span className="vip-green">VIP</span> {value.slice(4)}
    </p>
  );
}

/**
 * VIP page, laid out after the reference's `vip-tier-track` + `vip-table__wrapper`:
 * the five-tier track over the privileges matrix. Every group opens with its own
 * label and icon and spans several value rows; the value columns alternate a
 * highlighted tier column, which stacks into two rounded strips.
 */
export default async function VipPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, levels, privileges, rules] = await Promise.all([
    getT('content'),
    getVipLevels(),
    getVipPrivileges(),
    getVipRules(),
  ]);

  return (
    <IntlScope namespaces={['content']}>
      <div data-page="vip" className="container-page">
        <JsonLd data={breadcrumbLd([{ name: brand.name, path: '' }, { name: t('pages.vip'), path: '/vip' }], region)} />
        <h1 className="form-title large title-special-top">
          <Icon name="crown" size={28} className="page-icon" />
          {t('pages.vip')}
        </h1>

        <div className="vip-tier-track" role="region" aria-label={t('vip.groupUpgrade')} tabIndex={0}>
          <ol className="vip-tier-track__list">
            {levels.map((level) => (
              <li key={level.id} data-vip-tier={level.id} className="vip-tier-track__item">
                <span className="vip-tier-track__marker" aria-hidden="true" />
                <p className="vip-tier-track__level">{level.name}</p>
                <p className="vip-tier-track__desc">{level.desc}</p>
                <p className="vip-tier-track__amount">{level.amount}</p>
                <p className="vip-tier-track__short">{level.short}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="vip-table__wrapper" data-vip-table>
          <h2 className="section-title section-title__vip">{t('vip.privilegesTitle')}</h2>
          <div className="vip-table">
            <div className="vip-row vip-row__borderless">
              <div className="vip-col__wrapper">
                <div className="vip-col vip-col-1" />
                <div className="vip-col vip-col-2" />
                {levels.map((level, index) => (
                  <div
                    key={level.id}
                    className={`vip-col vip-level--${level.id}${
                      index % 2 === 0 ? ' vip-col__highlighted' : ''
                    } vip-col__highlighted-top`}
                  >
                    <Icon name="crown" size={40} className="vip-level-icon" />
                  </div>
                ))}
              </div>
            </div>

            <div className="vip-row vip-row__borderless">
              <div className="vip-col__wrapper vip-col__wrapper-1">
                <div className="vip-col vip-col-1" />
                <div className="vip-col vip-col-2" />
                {levels.map((level, index) => (
                  <div
                    key={level.id}
                    className={`vip-col${index % 2 === 0 ? ' vip-col__highlighted' : ''}`}
                  >
                    <p>{level.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {privileges.map((group) => (
              <div key={group.id} className="vip-row">
                {group.rows.map((row, rowIndex) => (
                  <div key={row.id} className="vip-col__wrapper">
                    <div className="vip-col vip-col-1">
                      {rowIndex === 0 ? (
                        <>
                          <Icon name={GROUP_ICONS[group.id] ?? 'crown'} size={24} className="vip-col-1__icon" />
                          <p>{group.label}</p>
                        </>
                      ) : null}
                    </div>
                    <div className="vip-col vip-col-2">
                      <p>{row.label}</p>
                    </div>
                    {levels.map((level, index) => (
                      <div
                        key={level.id}
                        className={`vip-col${index % 2 === 0 ? ' vip-col__highlighted' : ''}`}
                      >
                        {privilegeValue(row.values[level.id])}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <InfoRuleToggle label={t('vip.rulesLabel')} className="mt-5">
          <Markdown source={rules} />
        </InfoRuleToggle>
      </div>
    </IntlScope>
  );
}
