import { beforeEach, describe, expect, it, vi } from "vitest";
import http from "@/lib/api/httpClient";
import { order } from "@/test/orders";
import { listStoreOrders } from "./ordersApi";

vi.mock("@/lib/api/httpClient", () => ({
  default: { get: vi.fn() },
}));

const mockHttp = vi.mocked(http);

describe("listStoreOrders", () => {
  beforeEach(() => vi.resetAllMocks());

  it("fetches the store's orders, forwarding the abort signal", async () => {
    const signal = new AbortController().signal;
    mockHttp.get.mockResolvedValue({ data: [order()] });

    await expect(listStoreOrders(7, signal)).resolves.toEqual([order()]);
    expect(mockHttp.get).toHaveBeenCalledWith("/orders/stores/7", { signal });
  });
});
