import { beforeEach, describe, expect, it, vi } from "vitest";
import http from "@/lib/api/httpClient";
import { order } from "@/test/orders";
import { listStoreOrders, updateOrderStatus } from "./ordersApi";

vi.mock("@/lib/api/httpClient", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
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

describe("updateOrderStatus", () => {
  beforeEach(() => vi.resetAllMocks());

  it("sends the new status and returns the updated order", async () => {
    const updated = order({ id: 42, status: "ACCEPTED" });
    mockHttp.patch.mockResolvedValue({ data: updated });

    await expect(updateOrderStatus(42, "ACCEPTED")).resolves.toEqual(updated);
    expect(mockHttp.patch).toHaveBeenCalledWith("/orders/42/status", {
      status: "ACCEPTED",
    });
  });
});
