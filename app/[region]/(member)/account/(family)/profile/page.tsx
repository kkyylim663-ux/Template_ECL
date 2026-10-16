import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { Icon } from '@/components/ui/Icon';
import { ProfilePanel } from '@/components/account/ProfilePanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.profile'), robots: { index: false, follow: false } };
}

/**
 * "Profile" is a client-side view on the original (its menu entry has no URL
 * and no snapshot), so this page keeps the build's own profile form — now the
 * interactive T49 one — inside the reference's account card.
 */
export default async function ProfilePage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <div className="account-content__container">
      <h1 className="form-title mb-20 has-space">
        <Icon name="user" size={28} className="page-icon" />
        {t('profile.title')}
      </h1>
      <ProfilePanel
        profile={{
          username: payload.profile.username,
          nickname: payload.profile.nickname,
          fullName: payload.profile.fullName,
          email: payload.profile.email,
          mobileMasked: payload.profile.mobileMasked,
          vipTier: payload.profile.vipTier,
          kycStatus: payload.profile.kycStatus,
          joinedAt: payload.profile.joinedAt,
        }}
      />
    </div>
  );
}
