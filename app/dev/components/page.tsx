import type { Metadata } from 'next';
import { ComponentsDemo } from '@/components/dev/ComponentsDemo';
import { IntlScope } from '@/lib/i18n/scope';

/**
 * Component gallery. Dev-only and not linked from the shell; the copy is
 * translated like everything else so it can be read in any of the four
 * languages. `robots.ts` disallows `/dev` and it never enters the sitemap.
 */
export const metadata: Metadata = {
  title: 'Components',
  robots: { index: false, follow: false },
};

export default function ComponentsDemoPage() {
  return (
    <IntlScope namespaces={['games']}>
      <ComponentsDemo />
    </IntlScope>
  );
}
