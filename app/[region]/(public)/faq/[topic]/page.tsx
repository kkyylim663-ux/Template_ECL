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

/**
 * Each topic answers under its own title, e.g. "Finance · <brand>" (T24).
 *
 * Layout is the reference's topic page: `.generalPage.sidebarPage.container` with
 * the 280px `.sidebar` of topic links beside the `.contentWrapper.active` answer
 * column (see `crawl/pages/my_gettingstart.html`). Below 769px the two stack — the
 * crawl has no phone snapshot of this template, so that block is this build's own.
 */
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
      <section data-page="faq" className="generalPage sidebarPage container-page">
        <JsonLd data={faqPageLd(current.items)} />
        <JsonLd
          data={breadcrumbLd(
            [{ name: brand.name, path: '' }, { name: t('pages.faq'), path: '/faq' }],
            region,
          )}
        />

        <nav aria-label={t('faq.topics')} className="sidebar">
          {topics.map((entry) => {
            const active = entry.id === topic;
            return (
              <Link
                key={entry.id}
                href={regionPath(region, `/faq/${entry.id}`)}
                data-topic={entry.id}
                aria-current={active ? 'true' : undefined}
                className={`sidebarItem${active ? ' active' : ''}`}
              >
                {entry.title}
              </Link>
            );
          })}
        </nav>

        <div className="contentWrapper active">
          <div className="vertical-gap">
            <div>
              <h3>{current.title}</h3>
              <FaqPanel key={current.id} topicId={current.id} items={current.items} />
            </div>
          </div>
        </div>
      </section>
    </IntlScope>
  );
}
