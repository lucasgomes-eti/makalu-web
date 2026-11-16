import http from "@/lib/api/httpClient";
import { RealtimeCredentials } from "@/lib/realtime/emitterConnection";

interface RealtimeCredentialsResponse {
  url: string;
  channel: string;
  key: string;
  expires_at: string;
}

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
