import { brand } from '@/config/brand';
import { getT } from '@/lib/i18n/server';

/**
 * T02 placeholder. Every route renders this until its real page lands, so the
 * skeleton can be crawled end to end and any missing route is obvious.
 * Colours come from the design tokens in app/globals.css (docs/UI_REFERENCE.md).
 */
export async function RoutePlaceholder({
  title,
  path,
  note,
}: {
  title: string;
  path: string;
  note?: string;
}) {
  const { t } = await getT('content');

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center gap-2">
        <span aria-hidden className="bg-accent inline-block size-5 rounded-[5px]" />
        <span className="text-ink text-sm font-semibold tracking-[0.2em] uppercase">
          {brand.name}
        </span>
      </div>
      <p className="text-muted mt-6 text-xs font-medium tracking-[0.2em] uppercase">
        {t('placeholder.eyebrow')}
      </p>
      <h1 className="text-ink mt-3 text-2xl font-semibold">{title}</h1>
      <p className="text-accent mt-2 font-mono text-sm break-all">{path}</p>
      {note ? <p className="text-muted mt-4 text-sm">{note}</p> : null}
      <p className="border-line text-muted mt-8 border-t pt-3 text-xs">
        {brand.legal.demoNotice}
      </p>
    </section>
  );
}
