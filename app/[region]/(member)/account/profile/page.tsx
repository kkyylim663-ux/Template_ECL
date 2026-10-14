import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { ProfileForm } from '@/components/account/forms';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const payload = await getAccountPayload();

  return (
    <section className="space-y-4">
      <div className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
        <h2 className="text-ink text-sm font-semibold">Profile</h2>
        <dl className="mt-3 grid gap-3 text-xs desktop:grid-cols-3">
          <div>
            <dt className="text-muted">Username</dt>
            <dd className="text-ink font-mono">{payload.profile.username}</dd>
          </div>
          <div>
            <dt className="text-muted">VIP tier</dt>
            <dd className="text-accent capitalize">{payload.profile.vipTier}</dd>
          </div>
          <div>
            <dt className="text-muted">Verification</dt>
            <dd className="text-ink capitalize">{payload.profile.kycStatus}</dd>
          </div>
          <div>
            <dt className="text-muted">Member since</dt>
            <dd className="text-ink">{payload.profile.joinedAt.slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-muted">Mobile</dt>
            <dd className="text-ink font-mono">{payload.profile.mobileMasked}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
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
