import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// T76: every jsx-a11y rule is on — as a warning, so the audit is visible during
// review; the three that break machines and screen readers fail the build
// instead. `anchor-is-valid` stays a warning on purpose: this build's Play Now /
// Demo actions are `#` anchors by design (game launch is a stub), not mistakes.
// The plugin itself is registered by `next/core-web-vitals` — redefining it here
// would be a ConfigError — so only the rules are set.
const a11yWarnings = Object.fromEntries(Object.keys(jsxA11y.rules).map((rule) => [`jsx-a11y/${rule}`, 'warn']));

const eslintConfig = [
  // `prettier` last: it only switches off stylistic rules that Prettier owns.
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    rules: {
      // A leading underscore marks a parameter the signature needs but the P0
      // implementation deliberately ignores (see lib/game/launch.ts).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    rules: {
      ...a11yWarnings,
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '_scratch/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
];

export default eslintConfig;
