import { brand } from '@/config/brand';

/**
 * T02 placeholder. Every route renders this until its real page lands, so the
 * skeleton can be crawled end to end and any missing route is obvious.
 */
export function RoutePlaceholder({
  title,
  path,
  note,
}: {
  title: string;
  path: string;
  note?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center gap-2">
        <span aria-hidden className="bg-[var(--color-accent)] inline-block size-5 rounded-[5px]" />
        <span className="text-sm font-semibold tracking-[0.2em] text-zinc-300 uppercase">
          {brand.name}
        </span>
      </div>
      <p className="mt-6 text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
        P0 route skeleton
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-zinc-100">{title}</h1>
      <p className="mt-2 font-mono text-sm break-all text-emerald-400">{path}</p>
      {note ? <p className="mt-4 text-sm text-zinc-400">{note}</p> : null}
    </section>
  );
}
