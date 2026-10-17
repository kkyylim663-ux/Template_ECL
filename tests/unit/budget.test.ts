import { describe, expect, it } from 'vitest';
import {
  budgetVerdict,
  CAPS,
  firstLoadScripts,
  formatKb,
  TARGETS,
} from '../../scripts/check-budget.mjs';

/**
 * T71: the pure half of scripts/check-budget.mjs — parsing the served HTML and
 * turning the two numbers into a pass/fail verdict. The CLI half (fetching the
 * page, summing chunk bytes) needs a live server and is not unit-tested.
 */
describe('firstLoadScripts', () => {
  it('reads src and flags the noModule polyfill', () => {
    const html = [
      '<script src="/_next/static/chunks/polyfills-abc.js" noModule=""></script>',
      '<script src="/_next/static/chunks/main-abc.js" async=""></script>',
      '<script>self.__next_f.push([1,"inline"])</script>',
      '<link rel="preload" as="script" href="/_next/static/chunks/late.js">',
    ].join('');

    expect(firstLoadScripts(html)).toEqual([
      { src: '/_next/static/chunks/polyfills-abc.js', noModule: true },
      { src: '/_next/static/chunks/main-abc.js', noModule: false },
    ]);
  });

  it('returns nothing for a page with only inline scripts', () => {
    expect(firstLoadScripts('<script>1</script><script>2</script>')).toEqual([]);
  });
});

describe('budgetVerdict', () => {
  it('passes under both caps', () => {
    const verdict = budgetVerdict({ htmlBytes: 50 * 1024, jsGzipBytes: 120 * 1024 });
    expect(verdict.ok).toBe(true);
    expect(verdict.gaps).toEqual([]);
  });

  it('separates a met cap from a missed target', () => {
    const verdict = budgetVerdict({ htmlBytes: 64 * 1024, jsGzipBytes: 120 * 1024 });

    expect(verdict.ok).toBe(true);
    expect(verdict.gaps.map((gap) => gap.name)).toEqual(['home HTML raw']);
    expect(verdict.gaps[0].overTarget).toBe(4 * 1024);
  });

  it('fails when a value crosses its cap', () => {
    const verdict = budgetVerdict({
      htmlBytes: CAPS.htmlBytes,
      jsGzipBytes: CAPS.jsGzipBytes + 1,
    });

    expect(verdict.ok).toBe(false);
    expect(verdict.rows[1].ok).toBe(false);
    expect(verdict.rows[1].overTarget).toBeGreaterThan(TARGETS.jsGzipBytes - CAPS.jsGzipBytes);
  });

  it('keeps both targets below their caps so a gap always shows', () => {
    expect(TARGETS.htmlBytes).toBeLessThan(CAPS.htmlBytes);
    expect(TARGETS.jsGzipBytes).toBeLessThan(CAPS.jsGzipBytes);
  });
});

describe('formatKb', () => {
  it('renders the gzip figure the P3/P4/P5 reports quote', () => {
    expect(formatKb(26666)).toBe('26.0 KB');
    expect(formatKb(0)).toBe('0.0 KB');
  });
});
