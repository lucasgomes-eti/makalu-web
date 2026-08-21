import http from "@/lib/api/httpClient";
import { uploadFile } from "@/lib/api/media";
import { parseAmount } from "@/lib/format/currency";
import {
  Category,
  Store,
  StoreFormValues,
  StoreRequest,
  StoreSummary,
} from "../model/store.types";

/** Stores the signed-in user owns; drives the store switcher. */
export async function listOwnedStores(
  signal?: AbortSignal,
): Promise<StoreSummary[]> {
  const { data } = await http.get<StoreSummary[]>("/stores/owned", { signal });
  return data;
}

export async function getStore(
  storeId: number,
  signal?: AbortSignal,
): Promise<Store> {
  const { data } = await http.get<Store>(`/stores/${storeId}`, { signal });
  return data;
}

export async function listCategories(signal?: AbortSignal): Promise<Category[]> {
  const { data } = await http.get<Category[]>("/categories", { signal });
  return data;
}

function toRequest(values: StoreFormValues): StoreRequest {
  return {
    name: values.name.trim(),
    categories_ids: values.categoryIds,
    // Validation guarantees these are set before a save is attempted.
    latitude: values.latitude as number,
    longitude: values.longitude as number,
    delivery_fee: parseAmount(values.deliveryFee),
    logo_image_id: null,
    cover_image_id: null,
  };
}

/**
 * Use case: *create or update a store, with its images*.
 *
 * Images can only be attached to a store that exists, so this is inherently two
 * steps. Keeping both inside one function means callers cannot forget the second —
 * and an upload failure rejects, rather than being swallowed while the UI navigates
 * away as if everything had worked.
 *
 * @param storeId omit to create a new store.
 * @returns the id of the created or updated store.
 */
export async function saveStore(
  values: StoreFormValues,
  storeId?: number,
): Promise<number> {
  const payload = toRequest(values);

  let savedStoreId: number;

  if (storeId) {
    await http.put(`/stores/${storeId}`, payload);
    savedStoreId = storeId;
  } else {
    const { data } = await http.post<{ id: number }>("/stores", payload);
    savedStoreId = data.id;
  }

  if (values.logoFile) {
    await uploadFile(`/stores/${savedStoreId}/upload-logo-image`, values.logoFile);
  }

  if (values.coverFile) {
    await uploadFile(`/stores/${savedStoreId}/upload-cover-image`, values.coverFile);
  }

  return savedStoreId;
}
