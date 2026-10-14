import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('login', { region, path: '/login', index: false });
}

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
      <div className="mx-auto w-full max-w-md py-6">
        <h1 className="text-ink text-xl font-semibold">{t('login.title')}</h1>
        <p className="text-muted mt-1 text-xs">{t('login.subtitle')}</p>

        {next ? (
          <p className="border-accent text-accent mt-4 rounded-[var(--radius-tag)] border px-3 py-2 text-xs">
            {t('login.callbackNotice', { path: next })}
          </p>
        ) : null}

        <div className="mt-5">
          <LoginForm next={next} />
        </div>

        <p className="text-muted mt-5 flex flex-wrap justify-between gap-2 text-xs">
          <Link href={`/${region}/forgot-password`} className="text-accent hover:underline">
            {t('login.forgot')}
          </Link>
          <span>
            {t('login.noAccount')}{' '}
            <Link href={`/${region}/register`} className="text-accent hover:underline">
              {t('login.goRegister')}
            </Link>
          </span>
        </p>
      </div>
    </IntlScope>
  );
}
