import type { ReactNode } from 'react';
import { brand } from '@/config/brand';
import { getT } from '@/lib/i18n/server';
import { breadcrumbLd } from '@/lib/seo';
import type { PageContent } from '@/lib/api';
import { Markdown } from '@/components/content/Markdown';
import { PageToc, type TocItem } from '@/components/content/PageToc';
import { BackToTop } from '@/components/content/BackToTop';
import { JsonLd } from '@/components/content/JsonLd';

/**
 * The shared long-form layout for about / contact / tnc / betting-rules: a table
 * of contents beside the body on desktop (a dropdown on mobile), sections with
 * anchor ids, and a back-to-top button. `blocks` are extra sections that belong
 * to one page only (the contact cards, the demo form) and join the contents.
 *
 * The reference folds these pages into an accordion (`.accordionItem` under
 * `.generalPage`); P1 keeps one contents rail instead so all four read the same
 * way, and T37a aligns the surrounding type scale with the reference — 64px above
 * and 120px below (`.generalPage`), a 20px/700 heading and 16px/21 body copy with
 * 19px between list rows. Whether to adopt the accordion itself is recorded in
 * PROGRESS.md (T37a row) as the one open structural difference.
 */
export async function LongFormPage({
  region,
  title,
  page,
  blocks = [],
}: {
  region: string;
  title: string;
  page: PageContent;
  blocks?: { id: string; title: string; node: ReactNode }[];
}) {
  const { t } = await getT('content');
  const path = `/${page.slug}`;
  const items: TocItem[] = [
    ...page.sections.map((section) => ({ id: section.id, title: section.title })),
    ...blocks.map((block) => ({ id: block.id, title: block.title })),
  ];

  return (
    <article data-page="longform" data-slug={page.slug} className="generalPage container-page">
      <JsonLd
        data={breadcrumbLd(
          [
            { name: brand.name, path: '' },
            { name: title, path },
          ],
          region,
        )}
      />
      <header className="desc">
        <h3>{title}</h3>
        <p className="text-muted text-xs">{t('longform.updated', { date: page.updatedAt })}</p>
      </header>

      <div className="mt-6 grid gap-6 desktop:grid-cols-[210px_minmax(0,1fr)] desktop:gap-10">
        <PageToc items={items} />

        <div className="min-w-0">
          {page.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="desc [scroll-margin-top:110px]"
              data-longform-section
            >
              <h3>{section.title}</h3>
              <Markdown source={section.body} />
            </section>
          ))}

          {blocks.map((block) => (
            <section
              key={block.id}
              id={block.id}
              className="desc [scroll-margin-top:110px]"
              data-longform-section
            >
              <h3>{block.title}</h3>
              {block.node}
            </section>
          ))}
        </div>
      </div>

      <BackToTop />
    </article>
  );
}
