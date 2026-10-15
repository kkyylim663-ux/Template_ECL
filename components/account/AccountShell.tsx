import Link from 'next/link';
import { getAccountPayload, mainWallet, totalBalanceMinor } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { regionConfig, type RegionCode } from '@/config/brand';
import { regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';
import { getT } from '@/lib/i18n/server';
import { AccountMenu } from './AccountMenu';

/**
 * The account family shell (reference `.account-wrapper`): a 229px column —
 * profile block, then the menu — beside a 1014px content column whose first
 * row is the five-card balance strip. Every value in the strip is the
 * reference's own (a fresh account shows MYR 0.00 upgrade / limit, "Time 1");
 * only the registration date is filled from the payload, where the reference
 * leaves it to JS.
 *
 * `.account-wrapper` itself lives here rather than in the page so that the
 * pages below only render their own content container.
 */
export async function AccountShell({
  region,
  children,
}: {
  region: string;
  children: React.ReactNode;
}) {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);
  const currency = regionConfig(region as RegionCode).currency;
  const wallet = mainWallet(payload);
  const balanceMinor = wallet ? wallet.amountMinor : totalBalanceMinor(payload);
  const balance = (balanceMinor / 100).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const zero = (0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="account-wrapper">
      <div className="account-content__wrapper">
        <div className="account-header">
          <div className="account-menu__profile">
            <div className="account-menu__profile-body">
              <span className="account-menu__profile-avatar bg-panel-soft grid place-items-center" aria-hidden>
                <Icon name="user" size={32} className="text-muted" />
              </span>
              <div className="account-menu__profile-content">
                <p>{t('hello')}</p>
                <div className="account-menu__profile-balance__wrapper">
                  <div className="account-menu__profile-balance">
                    <span className="account-menu__profile-balance-currency">{currency}</span>
                    <span className="account-menu__profile-balance-amount">{balance}</span>
                  </div>
                </div>
                <Link href={regionPath(region, '/account/transfer')} className="account-menu__profile-wallet">
                  {t('viewWallet')}
                </Link>
              </div>
            </div>
            <div className="account-menu__profile-footer">
              {(['email', 'mobile'] as const).map((channel, index) => (
                <span key={channel} className="account-menu__verify-wrapper">
                  <span className={index === 0 ? 'account-menu__verify' : 'account-menu__verify-2'}>
                    <Icon name={channel === 'email' ? 'mail' : 'phone'} size={16} />
                    {payload.profile.kycStatus === 'verified' ? (
                      <Icon
                        name="check"
                        size={16}
                        className={
                          index === 0
                            ? 'account-menu__verfiy-icon-tick text-success'
                            : 'account-menu__verfiy-icon-tick-2 text-success'
                        }
                      />
                    ) : null}
                  </span>
                  {t('verify')}
                </span>
              ))}
            </div>
          </div>

          <div className="account-summary__wrapper">
            <div className="account-summary__card account-summary__card-center">
              <p className="account-summary__badge">{payload.profile.vipTier}</p>
            </div>
            <div className="account-summary__card">
              <p className="account-summary__currency">{currency}</p>
              <p className="account-summary__amount">{zero}</p>
              <p className="account-summary__desc">{t('summary.upgrade')}</p>
            </div>
            <div className="account-summary__card">
              <p className="account-summary__currency">{currency}</p>
              <p className="account-summary__amount">{zero}</p>
              <p className="account-summary__desc">{t('summary.withdrawalLimit')}</p>
            </div>
            <div className="account-summary__card">
              <p className="account-summary__currency">{t('summary.time')}</p>
              <p className="account-summary__amount">1</p>
              <p className="account-summary__desc">{t('summary.withdrawalFrequency')}</p>
            </div>
            <div className="account-summary__card">
              <p className="account-summary__amount">{formatDate(payload.profile.joinedAt)}</p>
              <p className="account-summary__desc">{t('summary.registrationDate')}</p>
            </div>
          </div>
        </div>

        <div className="display-flex">
          <AccountMenu region={region} />
          {children}
        </div>
      </div>
    </div>
  );
}
