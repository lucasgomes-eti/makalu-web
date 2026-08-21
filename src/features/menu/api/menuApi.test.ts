import { beforeEach, describe, expect, it, vi } from "vitest";
import http from "@/lib/api/httpClient";
import {
  EMPTY_MENU_ITEM_FORM,
  MenuItemFormValues,
  MenuItemRequest,
} from "../model/menuItem.types";
import { deleteMenuItem, listMenuItems, saveMenuItem } from "./menuApi";

vi.mock("@/lib/api/httpClient", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockHttp = vi.mocked(http);

const values: MenuItemFormValues = {
  ...EMPTY_MENU_ITEM_FORM,
  name: "  Cheeseburger  ",
  category: " Burgers ",
  price: "24.90",
  ingredients: "Beef, cheese",
  configurations: [
    {
      key: "configuration-1",
      name: " Size ",
      type: "SINGLE_CHOICE",
      options: [{ name: "Large", additional_price: 3 }],
    },
  ],
};

describe("listMenuItems", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the array the API sends", async () => {
    mockHttp.get.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });

    await expect(listMenuItems(7)).resolves.toHaveLength(2);
    expect(mockHttp.get).toHaveBeenCalledWith("/stores/7/menu", {
      signal: undefined,
    });
  });

  it("wraps the bare object the API sends for a one-item menu", async () => {
    mockHttp.get.mockResolvedValue({ data: { id: 1, name: "Fries" } });

    await expect(listMenuItems(7)).resolves.toEqual([{ id: 1, name: "Fries" }]);
  });
});

describe("saveMenuItem", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates a new item and returns the id the API assigned", async () => {
    mockHttp.post.mockResolvedValue({ data: { id: 99 } });

    await expect(saveMenuItem(7, values)).resolves.toBe(99);
    expect(mockHttp.post).toHaveBeenCalledWith("/stores/7/menu", expect.anything());
    expect(mockHttp.put).not.toHaveBeenCalled();
  });

  it("updates an existing item and keeps its id", async () => {
    mockHttp.put.mockResolvedValue({ status: 204 });

    await expect(saveMenuItem(7, values, 12)).resolves.toBe(12);
    expect(mockHttp.put).toHaveBeenCalledWith("/stores/7/menu/12", expect.anything());
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it("trims text and sends the price as a number", async () => {
    mockHttp.post.mockResolvedValue({ data: { id: 1 } });

    await saveMenuItem(7, values);

    expect(mockHttp.post).toHaveBeenCalledWith("/stores/7/menu", {
      name: "Cheeseburger",
      category: "Burgers",
      price: 24.9,
      ingredients: "Beef, cheese",
      configurations: [
        {
          name: "Size",
          type: "SINGLE_CHOICE",
          options: [{ name: "Large", additional_price: 3 }],
        },
      ],
    });
  });

  it("strips the client-only configuration key from the payload", async () => {
    mockHttp.post.mockResolvedValue({ data: { id: 1 } });

    await saveMenuItem(7, values);

    const [, payload] = mockHttp.post.mock.calls[0] as [string, MenuItemRequest];
    expect(payload.configurations[0]).not.toHaveProperty("key");
  });

  it("uploads the photo against the id returned by the create call", async () => {
    mockHttp.post
      .mockResolvedValueOnce({ data: { id: 99 } })
      .mockResolvedValueOnce({ status: 200 });
    const imageFile = new File(["x"], "burger.png", { type: "image/png" });

    await saveMenuItem(7, { ...values, imageFile });

    expect(mockHttp.post).toHaveBeenLastCalledWith(
      "/stores/7/menu/99/upload-image",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  });

  it("skips the upload when no photo was chosen", async () => {
    mockHttp.post.mockResolvedValue({ data: { id: 99 } });

    await saveMenuItem(7, values);

    expect(mockHttp.post).toHaveBeenCalledTimes(1);
  });

  it("rejects when the upload fails, rather than reporting success", async () => {
    mockHttp.put.mockResolvedValue({ status: 204 });
    mockHttp.post.mockRejectedValue(new Error("upload failed"));
    const imageFile = new File(["x"], "burger.png", { type: "image/png" });

    await expect(saveMenuItem(7, { ...values, imageFile }, 12)).rejects.toThrow(
      "upload failed",
    );
  });
});

describe("deleteMenuItem", () => {
  it("targets the item within its store", async () => {
    mockHttp.delete.mockResolvedValue({ status: 204 });

    await deleteMenuItem(7, 12);

    expect(mockHttp.delete).toHaveBeenCalledWith("/stores/7/menu/12");
  });
});
