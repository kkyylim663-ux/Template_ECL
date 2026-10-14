import type { ReactNode } from 'react';
import { getT } from '@/lib/i18n/server';
import type { PageContent } from '@/lib/api';
import { Markdown } from '@/components/content/Markdown';
import { PageToc, type TocItem } from '@/components/content/PageToc';
import { BackToTop } from '@/components/content/BackToTop';

/**
 * The shared long-form layout for about / contact / tnc / betting-rules: a table
 * of contents beside the body on desktop (a dropdown on mobile), sections with
 * anchor ids, and a back-to-top button. `blocks` are extra sections that belong
 * to one page only (the contact cards, the demo form) and join the contents.
 */
export async function LongFormPage({
  title,
  page,
  blocks = [],
}: {
  title: string;
  page: PageContent;
  blocks?: { id: string; title: string; node: ReactNode }[];
}) {
  const { t } = await getT('content');
  const items: TocItem[] = [
    ...page.sections.map((section) => ({ id: section.id, title: section.title })),
    ...blocks.map((block) => ({ id: block.id, title: block.title })),
  ];

  return (
    <article data-page="longform" data-slug={page.slug}>
      <header>
        <h1 className="text-ink text-xl font-semibold desktop:text-2xl">{title}</h1>
        <p className="text-muted mt-1 text-xs">
          {t('longform.updated', { date: page.updatedAt })}
        </p>
      </header>

      <div className="mt-6 grid gap-6 desktop:grid-cols-[210px_minmax(0,1fr)] desktop:gap-10">
        <PageToc items={items} />

        <div className="min-w-0 space-y-8">
          {page.sections.map((section) => (
            <section key={section.id} id={section.id} className="[scroll-margin-top:110px]">
              <h2 className="text-ink text-sm font-semibold desktop:text-base">{section.title}</h2>
              <div className="mt-3">
                <Markdown source={section.body} />
              </div>
            </section>
          ))}

          {blocks.map((block) => (
            <section key={block.id} id={block.id} className="[scroll-margin-top:110px]">
              <h2 className="text-ink text-sm font-semibold desktop:text-base">{block.title}</h2>
              <div className="mt-3">{block.node}</div>
            </section>
          ))}
        </div>
      </div>

      <BackToTop />
    </article>
  );
}
