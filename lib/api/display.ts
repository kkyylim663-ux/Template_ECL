import { callApi } from './client';
import { ENDPOINTS } from './endpoints';
import { displayPayloadSchema, type DisplayPayload, type VpnDemo } from './schemas';

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

/** Studio cards for a category, with the reference's own display names. */
export async function getCategoryProviderCards(
  category: string,
): Promise<{ id: string; isNew: boolean }[]> {
  const payload = await getDisplayPayload();
  const fresh = new Set(payload.newProviders?.[category] ?? []);

  return (payload.providersByCategory[category] ?? []).map((id) => ({
    id,
    isNew: fresh.has(id),
  }));
}

/** The VPN modal's demo credentials, exactly as the reference build shows them. */
export async function getVpnDemo(): Promise<VpnDemo> {
  const payload = await getDisplayPayload();
  return payload.vpnDemo;
}
