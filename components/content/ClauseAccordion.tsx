import type { PageContent } from '@/lib/api';
import { Markdown } from '@/components/content/Markdown';

/**
 * The reference folds tnc / betting-rules into a `.generalPage` heading over an
 * accordion of clauses, all closed by default. Native <details> keeps it
 * server-rendered — the FAQ reuses the same item classes with a button instead,
 * because its panel also needs state for the search.
 */
export function ClauseAccordion({ page, pageKey }: { page: PageContent; pageKey: string }) {
  return (
    <div data-page={pageKey} className="generalPage container-page">
      <h3>{page.title}</h3>
      <div className="accordionContent">
        {page.sections.map((section) => (
          <details key={section.id} className="accordionItem" data-clause={section.id}>
            <summary className="accordionItemHeading">
              <span className="accordion-icon" aria-hidden="true" />
              <span>{section.title}</span>
            </summary>
            <div className="accordionItemContent">
              <Markdown source={section.body} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
