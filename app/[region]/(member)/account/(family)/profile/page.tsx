import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { Icon } from '@/components/ui/Icon';
import { ProfileForm } from '@/components/account/forms';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.profile'), robots: { index: false, follow: false } };
}

/**
 * "Profile" is a client-side view on the original (its menu entry has no URL
 * and no snapshot), so this page keeps the build's own profile demo inside the
 * reference's account card.
 */
export default async function ProfilePage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <div className="account-content__container">
      <h1 className="form-title mb-5 large">
        <Icon name="user" size={28} className="page-icon" />
        {t('profile.title')}
      </h1>
      <ProfileForm payload={payload} />
    </div>
  );
}
