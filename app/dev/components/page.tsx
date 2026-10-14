import { ComponentsDemo } from '@/components/dev/ComponentsDemo';
import { IntlScope } from '@/lib/i18n/scope';

/**
 * Component gallery. Dev-only and not linked from the shell; the copy is
 * translated like everything else so it can be read in any of the four
 * languages (`/dev` is allowed by robots.txt but not in the sitemap).
 */
export default function ComponentsDemoPage() {
  return (
    <IntlScope namespaces={['games']}>
      <ComponentsDemo />
    </IntlScope>
  );
}
