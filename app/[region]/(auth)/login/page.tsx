import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
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
  return pageMetadata('login', { region, path: '/login', index: false });
}

/**
 * Sign-in, in the reference's shape: a `.card` on the full-height `.bg-wrapper`
 * (mounted by the (auth) layout) — header, logo slot, then the four-method form.
 */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const next = typeof query.next === 'string' ? query.next : undefined;
  const { t } = await getT('auth');

  return (
    <IntlScope namespaces={['auth']}>
      <div className="card" data-auth-card="login">
        <div className="card-header">
          <Link href={`/${region}`} className="card-back" aria-label={t('login.back')}>
            <Icon name="chevronLeft" size={20} />
          </Link>
          <h1 className="card-title">{t('login.title')}</h1>
          <Link href={`/${region}`} className="card-close" aria-label={t('login.closeCard')}>
            {'\u00d7'}
          </Link>
        </div>

        <div className="card-logo">
          <span className="card-logo__mark">{brand.name}</span>
        </div>

        <div className="card-body">
          {next ? (
            <p className="form-control__tips">{t('login.callbackNotice', { path: next })}</p>
          ) : null}
          <LoginForm next={next} region={region} />
        </div>
      </div>
    </IntlScope>
  );
}
