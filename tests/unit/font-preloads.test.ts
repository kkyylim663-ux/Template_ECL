import { describe, expect, it } from 'vitest';
import { parseLatinPreloads } from '@/lib/font-preloads';

/**
 * The home page's own Rubik declarations, trimmed: the latin subset carries the
 * `.p.` marker (what next/font preloads), latin-ext does not, and both weights
 * point at the same file.
 */
const RUBIK = `
@font-face{font-family:Rubik;font-style:normal;font-weight:400;font-display:swap;src:url(/_next/static/media/5b25d60b4670300e-s.woff2) format("woff2");unicode-range:u+0100-02ba,u+02bd-02c5}
@font-face{font-family:Rubik;font-style:normal;font-weight:400;font-display:swap;src:url(/_next/static/media/0a86735c6520d94f-s.p.woff2) format("woff2");unicode-range:u+00??,u+0131}
@font-face{font-family:Rubik;font-style:normal;font-weight:500;font-display:swap;src:url(/_next/static/media/0a86735c6520d94f-s.p.woff2) format("woff2");unicode-range:u+00??,u+0131}
@font-face{font-family:Rubik Fallback;src:local("Arial");ascent-override:89.06%}
`;

const NOTO = `
@font-face{font-family:Noto Sans;font-style:normal;font-weight:400;src:url(/_next/static/media/1755441e3a2fa970-s.p.woff2) format("woff2");unicode-range:u+00??,u+0131}
`;

describe('parseLatinPreloads', () => {
  it('keeps the preloadable latin subset, drops latin-ext and the sized fallback', () => {
    expect(parseLatinPreloads(RUBIK)).toEqual(['/_next/static/media/0a86735c6520d94f-s.p.woff2']);
  });

  it('de-duplicates weights that share a file and sorts across families', () => {
    expect(parseLatinPreloads(`${RUBIK}${NOTO}`)).toEqual([
      '/_next/static/media/0a86735c6520d94f-s.p.woff2',
      '/_next/static/media/1755441e3a2fa970-s.p.woff2',
    ]);
  });

  it('returns nothing for a stylesheet without preloadable fonts', () => {
    expect(parseLatinPreloads('@font-face{font-family:X;src:url(/x.woff2)}')).toEqual([]);
    expect(parseLatinPreloads('')).toEqual([]);
  });
});
