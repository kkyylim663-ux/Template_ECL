import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('register', { region, path: '/register', index: false });
}

export default async function RegisterPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const { t } = await getT('auth');

  return (
    <IntlScope namespaces={['auth']}>
      <div className="mx-auto w-full max-w-3xl py-6">
        <h1 className="text-ink text-xl font-semibold">{t('register.title')}</h1>
        <p className="text-muted mt-1 text-xs">{t('register.subtitle')}</p>

        <div className="mt-5">
          <RegisterForm />
        </div>

        <p className="text-muted mt-5 text-xs">
          {t('register.haveAccount')}{' '}
          <Link href={`/${region}/login`} className="text-accent hover:underline">
            {t('register.goLogin')}
          </Link>
        </p>
      </div>
    </IntlScope>
  );
}
