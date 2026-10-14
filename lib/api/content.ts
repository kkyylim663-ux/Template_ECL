import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import {
  announcementListSchema,
  bannerListSchema,
  promotionListSchema,
  type Announcement,
  type Banner,
  type Promotion,
} from './schemas';

/** Home carousel slides. */
export async function getBanners(): Promise<Banner[]> {
  const { d } = await callApi(ENDPOINTS.homeBanner);
  return bannerListSchema.parse(d).sort((a, b) => a.order - b.order);
}

/** Site-wide notices: the marquee at the top and the announcement list. */
export async function getAnnouncements(): Promise<Announcement[]> {
  const { d } = await callApi(ENDPOINTS.announcement);
  return announcementListSchema.parse(d);
}

export async function getPromotions(): Promise<Promotion[]> {
  const { d } = await callApi(ENDPOINTS.displayPromo);
  return promotionListSchema.parse(d);
}

export async function getPromotionBySlug(slug: string): Promise<Promotion | null> {
  const promotions = await getPromotions();
  return promotions.find((promotion) => promotion.slug === slug) ?? null;
}
