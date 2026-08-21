import http from "@/lib/api/httpClient";
import { uploadFile } from "@/lib/api/media";
import { parseAmount } from "@/lib/format/currency";
import {
  MenuItem,
  MenuItemFormValues,
  MenuItemRequest,
} from "../model/menuItem.types";

/** Menu items belonging to a store. */
export async function listMenuItems(
  storeId: number,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  const { data } = await http.get<MenuItem[] | MenuItem>(
    `/stores/${storeId}/menu`,
    { signal },
  );
  // The API collapses a single-item menu to a bare object.
  return Array.isArray(data) ? data : [data];
}

export async function getMenuItem(
  menuItemId: number,
  signal?: AbortSignal,
): Promise<MenuItem> {
  const { data } = await http.get<MenuItem>(`/stores/menu/${menuItemId}`, {
    signal,
  });
  return data;
}

export async function deleteMenuItem(
  storeId: number,
  menuItemId: number,
): Promise<void> {
  await http.delete(`/stores/${storeId}/menu/${menuItemId}`);
}

function toRequest(values: MenuItemFormValues): MenuItemRequest {
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    price: parseAmount(values.price),
    ingredients: values.ingredients,
    // `key` is a client-side concern and must not reach the API.
    configurations: values.configurations.map(({ key, ...configuration }) => ({
      ...configuration,
      name: configuration.name.trim(),
    })),
  };
}

/**
 * Use case: *create or update a menu item, with its photo*.
 *
 * The image endpoint is keyed by menu item id, so a new item must be created before
 * its photo can be attached — both steps are kept here so a caller cannot do one
 * without the other.
 *
 * @param menuItemId omit to create a new item.
 * @returns the id of the created or updated item.
 */
export async function saveMenuItem(
  storeId: number,
  values: MenuItemFormValues,
  menuItemId?: number,
): Promise<number> {
  const payload = toRequest(values);
  let savedItemId: number;

  if (menuItemId) {
    await http.put(`/stores/${storeId}/menu/${menuItemId}`, payload);
    savedItemId = menuItemId;
  } else {
    const { data } = await http.post<{ id: number }>(
      `/stores/${storeId}/menu`,
      payload,
    );
    savedItemId = data.id;
  }

  if (values.imageFile) {
    await uploadFile(
      `/stores/${storeId}/menu/${savedItemId}/upload-image`,
      values.imageFile,
    );
  }

  return savedItemId;
}
