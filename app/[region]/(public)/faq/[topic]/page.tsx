import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFaq, getFaqTopics } from '@/lib/api';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';
import { IntlScope } from '@/lib/i18n/scope';
import { FaqPanel } from '@/components/content/FaqPanel';
import { pageMetadata } from '@/lib/seo';
import { breadcrumbLd } from '@/lib/seo';
import { brand } from '@/config/brand';
import { JsonLd } from '@/components/content/JsonLd';
import { faqPageLd } from '@/lib/seo';

/** Each topic answers under its own title, e.g. "Finance · <brand>" (T24). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; topic: string }>;
}): Promise<Metadata> {
  const { region, topic } = await params;
  const current = await getFaq(topic);

  return pageMetadata('faq', {
    region,
    path: `/faq/${topic}`,
    title: current?.title,
  });
}

/**
 * Help centre: the eight topics on the left, the chosen topic's questions on the
 * right. The topic lives in the path, so the sidebar is ordinary links and the
 * panel is server-rendered; only the filtering and the accordion are client-side.
 */
export default async function FaqTopicPage({
  params,
}: {
  params: Promise<{ region: string; topic: string }>;
}) {
  const { region, topic } = await params;
  const [{ t }, topics, current] = await Promise.all([
    getT('content'),
    getFaqTopics(),
    getFaq(topic),
  ]);

  if (!current) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <div data-page="faq">
        <JsonLd data={faqPageLd(current.items)} />
        <JsonLd data={breadcrumbLd([{ name: brand.name, path: '' }, { name: t('pages.faq'), path: '/faq' }], region)} />
        <header>
          <h1 className="text-ink text-xl font-semibold">{t('pages.faq')}</h1>
          <p className="text-muted mt-1 text-xs">{t('faq.intro')}</p>
        </header>

        <div className="mt-5 grid gap-5 desktop:grid-cols-[16rem_1fr]">
          {/* Topic sidebar: a horizontal scroller on phones, a column on desktop. */}
          <nav aria-label={t('faq.topics')} className="-mx-4 overflow-x-auto px-4 desktop:mx-0 desktop:px-0">
            <p className="text-muted text-[11px] tracking-widest uppercase">{t('faq.topics')}</p>
            <ul className="mt-2 flex w-max gap-2 desktop:w-auto desktop:flex-col desktop:gap-1">
              {topics.map((entry) => {
                const active = entry.id === topic;
                return (
                  <li key={entry.id}>
                    <Link
                      href={regionPath(region, `/faq/${entry.id}`)}
                      data-topic={entry.id}
                      aria-current={active ? 'true' : undefined}
                      className={`flex items-center justify-between gap-2 rounded-[var(--radius-tag)] border px-3 py-2 text-xs whitespace-nowrap desktop:w-full desktop:whitespace-normal ${
                        active
                          ? 'border-accent text-accent bg-panel-soft'
                          : 'border-line text-muted hover:border-accent hover:text-ink'
                      }`}
                    >
                      <span>{entry.title}</span>
                      <span className="text-muted text-[10px]">{entry.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <FaqPanel key={current.id} topicId={current.id} items={current.items} />
        </div>
      </div>
    </IntlScope>
  );
}
