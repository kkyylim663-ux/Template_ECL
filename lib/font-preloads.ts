import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The `<link rel="preload" as="font">` tags the root layout ships.
 *
 * next/font normally injects these itself, from `.next/server/next-font-manifest.json`
 * — but on this build that manifest comes out empty (`{"app":{}}`, see the T72 row
 * in the T72 row of ecl-site/PROGRESS.md), so no font is preloaded and the browser only discovers the
 * body font after it has parsed the stylesheet and laid out text. Lighthouse (T72)
 * showed the cost: the home hero's LCP text repainted 3.1 s after TTFB, waiting on
 * `Rubik-latin`, which arrived at 3.0–4.0 s on a throttled mobile profile.
 *
 * So the URLs are read back from the built stylesheet instead. next/font loads each
 * family's `latin` subset with the `.p.` marker in the file name (`-s.p.woff2`) —
 * the marker the webpack plugin uses to decide what is preloadable — so the parser
 * picks exactly the files next/font itself would have preloaded (one per family;
 * several weights share a file).
 *
 * Production only: in dev the stylesheet is served from a different path, and a
 * preload whose URL does not match the `@font-face` src is a second download.
 */
const CSS_DIR = ['.next', 'static', 'css'];

/** The preloadable font files referenced by one stylesheet. Pure, for the tests. */
export function parseLatinPreloads(css: string): string[] {
  const hrefs = new Set<string>();
  for (const block of css.matchAll(/@font-face\{([^}]*)\}/g)) {
    const src = /url\((\/_next\/static\/media\/[^)]*-s\.p\.woff2)\)/.exec(block[1]);
    if (src) hrefs.add(src[1]);
  }
  return [...hrefs].sort();
}

let cached: string[] | null = null;

export function fontPreloadHrefs(): string[] {
  if (cached) return cached;
  if (process.env.NODE_ENV !== 'production') {
    cached = [];
    return cached;
  }
  const hrefs = new Set<string>();
  try {
    const dir = join(process.cwd(), ...CSS_DIR);
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.css'))) {
      for (const href of parseLatinPreloads(readFileSync(join(dir, file), 'utf8'))) hrefs.add(href);
    }
  } catch {
    // No build output to read (e.g. a bare `next dev`): ship no preloads rather
    // than a guess. The page is correct either way, just without the head start.
  }
  cached = [...hrefs].sort();
  return cached;
}
