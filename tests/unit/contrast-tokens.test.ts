import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

/**
 * T76: the dark theme has one palette, and text must clear WCAG AA on the fills
 * the UI actually pairs it with. The values are read from globals.css so this
 * test follows a token edit instead of drifting away from it.
 */
const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

function token(name: string): string {
  const match = new RegExp(`\\${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match) throw new Error(`token ${name} not found in globals.css`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string): number {
  const [lighter, darker] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** fg, bg, what the pairing is used for. AA body text is 4.5:1. */
const PAIRS = [
  ['--color-ink', '--color-surface', 'body text on the page'],
  ['--color-ink', '--color-panel', 'card and header text'],
  ['--color-muted', '--color-surface', 'secondary text on the page'],
  ['--color-muted', '--color-panel-soft', 'desktop header labels'],
  ['--color-accent', '--color-surface', 'accent links and tags'],
  ['--color-ink-on-accent', '--color-accent', 'text on accent buttons'],
  ['--color-ink-on-accent', '--color-success', 'T76: the header Live badge'],
] as const;

for (const [fgToken, bgToken, usage] of PAIRS) {
  test(`${fgToken} on ${bgToken} clears AA (${usage})`, () => {
    const value = ratio(token(fgToken), token(bgToken));
    expect(
      Number(value.toFixed(2)),
      `${usage}: ${token(fgToken)} on ${token(bgToken)}`,
    ).toBeGreaterThanOrEqual(4.5);
  });
}
