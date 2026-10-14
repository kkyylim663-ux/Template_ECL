import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('forgotPassword', { region, path: '/forgot-password', index: false });
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const { t } = await getT('auth');

  return (
    <IntlScope namespaces={['auth']}>
      <div className="mx-auto w-full max-w-md py-6">
        <h1 className="text-ink text-xl font-semibold">{t('forgot.title')}</h1>
        <p className="text-muted mt-1 text-xs">{t('forgot.subtitle')}</p>

        <div className="mt-5">
          <ForgotPasswordForm />
        </div>

        <p className="text-muted mt-5 text-xs">
          <Link href={`/${region}/login`} className="text-accent hover:underline">
            {t('forgot.back')}
          </Link>
        </p>
      </div>
    </IntlScope>
  );
}
