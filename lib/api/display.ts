import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import { displayPayloadSchema, type DisplayPayload } from './schemas';
import { getSlotGameList } from './slots';

/**
 * Payload behind the display-only game pages (4D results, number game, prediction)
 * and the studio cards on the live casino / sports / esports pages. Placeholder
 * content, one round trip.
 */
export async function getDisplayPayload(): Promise<DisplayPayload> {
  const { d } = await callApi(ENDPOINTS.displayPage);
  return displayPayloadSchema.parse(d);
}

export async function getCategoryProviders(category: string): Promise<string[]> {
  const payload = await getDisplayPayload();
  return payload.providersByCategory[category] ?? [];
}

/** Studio cards for a category, with the number of titles each studio holds. */
export async function getCategoryProviderCards(
  category: string,
): Promise<{ id: string; totalGames: number }[]> {
  const [payload, list] = await Promise.all([getDisplayPayload(), getSlotGameList()]);

  return (payload.providersByCategory[category] ?? []).map((id) => ({
    id,
    totalGames: Object.keys(list.details[id] ?? {}).length,
  }));
}
