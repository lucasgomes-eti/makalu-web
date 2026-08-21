import { beforeEach, describe, expect, it, vi } from "vitest";
import http from "@/lib/api/httpClient";
import { EMPTY_STORE_FORM, StoreFormValues } from "../model/store.types";
import { listOwnedStores, saveStore } from "./storesApi";

vi.mock("@/lib/api/httpClient", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const mockHttp = vi.mocked(http);

const values: StoreFormValues = {
  ...EMPTY_STORE_FORM,
  name: "  Makalu Burgers ",
  categoryIds: [1, 3],
  latitude: -15.79,
  longitude: -47.88,
  deliveryFee: "4.50",
};

const logoFile = new File(["l"], "logo.png", { type: "image/png" });
const coverFile = new File(["c"], "cover.png", { type: "image/png" });

describe("listOwnedStores", () => {
  it("requests the caller's own stores", async () => {
    mockHttp.get.mockResolvedValue({ data: [{ id: 1 }] });

    await expect(listOwnedStores()).resolves.toEqual([{ id: 1 }]);
    expect(mockHttp.get).toHaveBeenCalledWith("/stores/owned", {
      signal: undefined,
    });
  });
});

describe("saveStore", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates a store and returns the new id", async () => {
    mockHttp.post.mockResolvedValue({ data: { id: 5 } });

    await expect(saveStore(values)).resolves.toBe(5);
    expect(mockHttp.post).toHaveBeenCalledWith("/stores", {
      name: "Makalu Burgers",
      categories_ids: [1, 3],
      latitude: -15.79,
      longitude: -47.88,
      delivery_fee: 4.5,
      logo_image_id: null,
      cover_image_id: null,
    });
  });

  it("updates an existing store without re-creating it", async () => {
    mockHttp.put.mockResolvedValue({ status: 204 });

    await expect(saveStore(values, 5)).resolves.toBe(5);
    expect(mockHttp.put).toHaveBeenCalledWith("/stores/5", expect.anything());
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it("uploads both images against the saved store", async () => {
    mockHttp.put.mockResolvedValue({ status: 204 });
    mockHttp.post.mockResolvedValue({ status: 200 });

    await saveStore({ ...values, logoFile, coverFile }, 5);

    expect(mockHttp.post.mock.calls.map(([url]) => url)).toEqual([
      "/stores/5/upload-logo-image",
      "/stores/5/upload-cover-image",
    ]);
  });

  it("uploads only what was actually chosen", async () => {
    mockHttp.put.mockResolvedValue({ status: 204 });
    mockHttp.post.mockResolvedValue({ status: 200 });

    await saveStore({ ...values, coverFile }, 5);

    expect(mockHttp.post.mock.calls.map(([url]) => url)).toEqual([
      "/stores/5/upload-cover-image",
    ]);
  });

  it("uploads against the id returned by create, not a guessed one", async () => {
    mockHttp.post
      .mockResolvedValueOnce({ data: { id: 77 } })
      .mockResolvedValueOnce({ status: 200 });

    await saveStore({ ...values, logoFile });

    expect(mockHttp.post).toHaveBeenLastCalledWith(
      "/stores/77/upload-logo-image",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  });

  it("propagates an upload failure instead of silently swallowing it", async () => {
    mockHttp.put.mockResolvedValue({ status: 204 });
    mockHttp.post.mockRejectedValue(new Error("logo rejected"));

    await expect(saveStore({ ...values, logoFile }, 5)).rejects.toThrow(
      "logo rejected",
    );
  });
});
