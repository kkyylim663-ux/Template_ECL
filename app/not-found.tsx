import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-16">
      <p className="text-xs font-medium tracking-[0.2em] text-zinc-400 uppercase">Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold text-zinc-100">Page not found</h1>
      <p className="mt-3 text-sm text-zinc-400">
        The link may be old, or the address may be mistyped. Demo build: placeholder brand, fake
        data.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/my"
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
        >
          Malaysia site
        </Link>
        <Link
          href="/sg"
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500"
        >
          Singapore site
        </Link>
      </div>
    </main>
  );
}
