import http from "@/lib/api/httpClient";
import { RealtimeCredentials } from "@/lib/realtime/emitterConnection";

/** `RealtimeCredentialsResponse` from the API. */
interface RealtimeCredentialsResponse {
  url: string;
  channel: string;
  key: string;
  expires_at: string;
}

/**
 * A read-only key for the store's order events channel, valid for 24 hours. The API
 * answers 404 for a store the user does not own and 503 (`MK-801`) while realtime is
 * switched off.
 */
export async function getStoreRealtimeCredentials(
  storeId: number,
  signal?: AbortSignal,
): Promise<RealtimeCredentials> {
  const { data } = await http.get<RealtimeCredentialsResponse>(
    `/orders/stores/${storeId}/realtime`,
    { signal },
  );
  return {
    url: data.url,
    channel: data.channel,
    key: data.key,
    expiresAt: data.expires_at,
  };
}
