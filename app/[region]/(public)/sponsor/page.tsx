import type { Metadata } from 'next';
import { getSponsorBlocks } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { IntlScope } from '@/lib/i18n/scope';
import { SponsorGallery } from '@/components/content/SponsorGallery';

export const metadata: Metadata = {
  title: 'Sponsor',
  description: 'Logo evolution, videos and the partners we back.',
};

/**
 * Sponsor page, laid out after the reference blocks in
 * docs/CONTENT_REFERENCE.md (`logo-evolution-card`, `shortVideoGrid`,
 * `influencerList`): logo carousel, video cards and the partner grid. No video is
 * embedded and no upstream asset is loaded — the covers are placeholders and the
 * play buttons only say so.
 */
export default async function SponsorPage() {
  const [{ t }, sponsor] = await Promise.all([getT('content'), getSponsorBlocks()]);

  return (
    <IntlScope namespaces={['content']}>
      <div data-page="sponsor" className="min-w-0">
        <header>
          <h1 className="text-ink text-xl font-semibold desktop:text-2xl">{t('pages.sponsor')}</h1>
          <p className="text-muted mt-1 text-xs">{t('sponsor.intro')}</p>
        </header>

        <div className="mt-5">
          <SponsorGallery sponsor={sponsor} />
        </div>
      </div>
    </IntlScope>
  );
}
