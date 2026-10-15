import type { Metadata } from 'next';
import { getBanners, getHomeBetting, getSlotGameList, listProviders } from '@/lib/api';
import { AppDownload } from '@/components/home/AppDownload';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { BettingTransaction } from '@/components/home/BettingTransaction';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { EntryCards } from '@/components/home/EntryCards';
import { ProviderRail } from '@/components/home/ProviderRail';
import { SponsorBlock } from '@/components/home/SponsorBlock';
import { IntlScope } from '@/lib/i18n/scope';
import { pageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/content/JsonLd';
import { organizationLd, websiteLd } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('home', { region, path: '' });
}

/**
 * Home page, in the reference build's block order: hero, mobile category strip,
 * the four quick entries, the provider rail (desktop), the betting block, the
 * sponsor block (desktop) and the app download. Images stay placeholders; every
 * number comes from the mock layer.
 */
export default async function HomePage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [banners, providers, betting] = await Promise.all([
    getBanners(),
    getSlotGameList().then((list) => listProviders(list)),
    getHomeBetting(),
  ]);

  return (
    <IntlScope namespaces={['home']}>
      <JsonLd data={[organizationLd(), websiteLd(region)]} />
      <BannerCarousel banners={banners} region={region} />
      <CategoryStrip region={region} />
      <EntryCards region={region} />
      <ProviderRail providers={providers} />
      <BettingTransaction betting={betting} region={region} />
      <SponsorBlock />
      <AppDownload />
    </IntlScope>
  );
}
