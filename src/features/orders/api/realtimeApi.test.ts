import { beforeEach, describe, expect, it, vi } from "vitest";
import http from "@/lib/api/httpClient";
import { getStoreRealtimeCredentials } from "./realtimeApi";

vi.mock("@/lib/api/httpClient", () => ({ default: { get: vi.fn() } }));

const mockHttp = vi.mocked(http);

describe("getStoreRealtimeCredentials", () => {
  beforeEach(() => vi.resetAllMocks());

  it("fetches the store's channel credentials, forwarding the abort signal", async () => {
    const signal = new AbortController().signal;
    mockHttp.get.mockResolvedValue({
      data: {
        url: "wss://broker.test/",
        channel: "makalu/store/7/orders/",
        key: "read-key",
        expires_at: "2026-11-14T18:04:11Z",
      },
    });

    await expect(getStoreRealtimeCredentials(7, signal)).resolves.toEqual({
      url: "wss://broker.test/",
      channel: "makalu/store/7/orders/",
      key: "read-key",
      expiresAt: "2026-11-14T18:04:11Z",
    });
    expect(mockHttp.get).toHaveBeenCalledWith("/orders/stores/7/realtime", { signal });
  });
});
