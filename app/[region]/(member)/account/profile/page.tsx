import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { ProfileForm } from '@/components/account/forms';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.profile'), robots: { index: false, follow: false } };
}

export default async function ProfilePage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <section className="space-y-4">
      <div className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
        <h2 className="text-ink text-sm font-semibold">{t('profile.title')}</h2>
        <dl className="mt-3 grid gap-3 text-xs desktop:grid-cols-3">
          <div>
            <dt className="text-muted">{t('profile.username')}</dt>
            <dd className="text-ink font-mono">{payload.profile.username}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('profile.vipTier')}</dt>
            <dd className="text-accent capitalize">{payload.profile.vipTier}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('profile.kycLabel')}</dt>
            <dd className="text-ink">{t(`profile.kyc.${payload.profile.kycStatus}`)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('profile.joined')}</dt>
            <dd className="text-ink">{payload.profile.joinedAt.slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('profile.mobile')}</dt>
            <dd className="text-ink font-mono">{payload.profile.mobileMasked}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('profile.email')}</dt>
            <dd className="text-ink">{payload.profile.email}</dd>
          </div>
        </dl>
      </div>

      <div className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
        <ProfileForm payload={payload} />
      </div>
    </section>
  );
}
