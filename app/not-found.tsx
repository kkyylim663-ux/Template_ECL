import Link from 'next/link';
import { getT } from '@/lib/i18n/server';

/**
 * Global 404. No region is known here (it may not even be a region path), so the
 * two market links stand in for navigation and the copy is translated like every
 * other page.
 */
export default async function NotFound() {
  const [{ t }, { t: tn }] = await Promise.all([getT('common'), getT('nav')]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-16">
      <img src="/illus/404.webp" alt="" width={160} height={160} className="mb-6" />
      <p className="text-muted text-xs font-medium tracking-[0.2em] uppercase">
        {t('state.errorCode')}
      </p>
      <h1 className="text-ink mt-3 text-3xl font-semibold">{t('state.notFound')}</h1>
      <p className="text-muted mt-3 text-sm">{t('state.notFoundHint')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/my"
          className="bg-accent hover:bg-accent-bright rounded-[8px] px-4 py-2 text-sm font-semibold text-[#1b1b1b]"
        >
          {tn('regionSite.my')}
        </Link>
        <Link
          href="/sg"
          className="border-line text-ink hover:border-accent rounded-[8px] border px-4 py-2 text-sm font-medium"
        >
          {tn('regionSite.sg')}
        </Link>
      </div>
    </main>
  );
}
