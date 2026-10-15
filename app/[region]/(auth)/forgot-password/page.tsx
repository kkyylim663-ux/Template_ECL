import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Icon } from '@/components/ui/Icon';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { brand } from '@/config/brand';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('forgotPassword', { region, path: '/forgot-password', index: false });
}

/**
 * Reset password. The reference snapshot for this route came back 404 and its
 * live site keeps it in the old build, so the card mirrors the sign-in one —
 * same `.card`, header, logo slot and `.form-control` / `.login-btn` shell.
 */
export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const { t } = await getT('auth');

  return (
    <IntlScope namespaces={['auth']}>
      <div className="card" data-auth-card="forgot">
        <div className="card-header">
          <Link href={`/${region}/login`} className="card-back" aria-label={t('login.back')}>
            <Icon name="chevronLeft" size={20} />
          </Link>
          <h1 className="card-title">{t('forgot.title')}</h1>
          <Link href={`/${region}`} className="card-close" aria-label={t('login.closeCard')}>
            {'\u00d7'}
          </Link>
        </div>

        <div className="card-logo">
          <span className="card-logo__mark">{brand.name}</span>
        </div>

        <div className="card-body">
          <p className="form-control__tips">{t('forgot.subtitle')}</p>
          <ForgotPasswordForm />
          <div className="login-signup-tips">
            <Link className="login-signup-now" href={`/${region}/login`}>
              {t('forgot.back')}
            </Link>
          </div>
        </div>
      </div>
    </IntlScope>
  );
}
