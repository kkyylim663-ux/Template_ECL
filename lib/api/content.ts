import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import {
  announcementListSchema,
  bannerListSchema,
  faqTopicListSchema,
  faqTopicSchema,
  pageContentSchema,
  promotionListSchema,
  promotionSchema,
  sponsorPayloadSchema,
  updateListSchema,
  updateSchema,
  vipPayloadSchema,
  type Announcement,
  type Banner,
  type FaqTopic,
  type FaqTopicSummary,
  type PageContent,
  type PageSlug,
  type Promotion,
  type SponsorPayload,
  type Update,
  type VipLevel,
  type VipPrivilegeGroup,
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

/* ------------------------------------------------------------- promotions */

export async function getPromotions(): Promise<Promotion[]> {
  const { d } = await callApi(ENDPOINTS.displayPromo);
  return promotionListSchema.parse(d);
}

/**
 * One promotion by id or slug — both spellings reach the same record, because
 * the home page links by slug and the detail route is `[id]`.
 *
 * The mock answers from the same fixture the list uses; in the live build the
 * body reaches the endpoint and an unknown id comes back as `null`.
 */
export async function getPromotion(idOrSlug: string): Promise<Promotion | null> {
  const { d } = await callApi(ENDPOINTS.promotionDetail, { id: idOrSlug });
  return d == null ? null : promotionSchema.parse(d);
}

/** The promotion before/after the given one in list order, for detail paging. */
export async function getPromotionNeighbours(
  idOrSlug: string,
): Promise<{ previous: Promotion | null; next: Promotion | null }> {
  const promotions = await getPromotions();
  const index = promotions.findIndex(
    (promotion) => promotion.id === idOrSlug || promotion.slug === idOrSlug,
  );
  if (index === -1) return { previous: null, next: null };
  return {
    previous: promotions[index - 1] ?? null,
    next: promotions[index + 1] ?? null,
  };
}

/* ---------------------------------------------------------------- updates */

/** News items, newest first. */
export async function getUpdates(): Promise<Update[]> {
  const { d } = await callApi(ENDPOINTS.updateList);
  return updateListSchema
    .parse(d)
    .slice()
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));
}

export async function getUpdate(id: string): Promise<Update | null> {
  const { d } = await callApi(ENDPOINTS.updateDetail, { id });
  return d == null ? null : updateSchema.parse(d);
}

/* -------------------------------------------------------------------- faq */

/** The eight help topics with their question counts, for the sidebar. */
export async function getFaqTopics(): Promise<FaqTopicSummary[]> {
  const { d } = await callApi(ENDPOINTS.faqTopics);
  return faqTopicListSchema.parse(d);
}

export async function getFaq(topic: string): Promise<FaqTopic | null> {
  const { d } = await callApi(ENDPOINTS.faqTopic, { topic });
  return d == null ? null : faqTopicSchema.parse(d);
}

/* -------------------------------------------------------------------- vip */

export async function getVipLevels(): Promise<VipLevel[]> {
  const { d } = await callApi(ENDPOINTS.vipLevels);
  return vipPayloadSchema.parse(d).levels;
}

/** The rules block shown under the tier track. */
export async function getVipRules(): Promise<string> {
  const { d } = await callApi(ENDPOINTS.vipLevels);
  return vipPayloadSchema.parse(d).rules;
}

/** The `vip-table__wrapper` matrix: privilege rows across the five tiers. */
export async function getVipPrivileges(): Promise<VipPrivilegeGroup[]> {
  const { d } = await callApi(ENDPOINTS.vipLevels);
  return vipPayloadSchema.parse(d).privileges;
}

/* ---------------------------------------------------------------- sponsor */

export async function getSponsorBlocks(): Promise<SponsorPayload> {
  const { d } = await callApi(ENDPOINTS.sponsorBlocks);
  return sponsorPayloadSchema.parse(d);
}

/* ------------------------------------------------------------ long-form pages */

/** about / contact / tnc / betting-rules, with their TOC sections. */
export async function getPageContent(slug: PageSlug): Promise<PageContent | null> {
  const { d } = await callApi(ENDPOINTS.contentPage, { slug });
  return d == null ? null : pageContentSchema.parse(d);
}
