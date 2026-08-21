/** A cuisine/kind label a store can be tagged with. */
export interface Category {
  id: number;
  description: string;
}

/** A store as returned by `GET /stores/{id}`. */
export interface Store {
  id: number;
  name: string;
  categories: Category[];
  latitude: number;
  longitude: number;
  delivery_fee: number | null;
  logo_image_id: number | null;
  cover_image_id: number | null;
}

/** The lighter shape returned by `GET /stores/owned`. */
export interface StoreSummary {
  id: number;
  name: string;
  logo_image_id: number | null;
}

/** Write payload for `POST /stores` and `PUT /stores/{id}`. */
export interface StoreRequest {
  name: string;
  categories_ids: number[];
  latitude: number;
  longitude: number;
  delivery_fee: number;
  logo_image_id: number | null;
  cover_image_id: number | null;
}

/** Everything the store form holds, including the not-yet-uploaded files. */
export interface StoreFormValues {
  name: string;
  categoryIds: number[];
  latitude: number | null;
  longitude: number | null;
  deliveryFee: string;
  logoFile: File | null;
  coverFile: File | null;
}

export type StoreFormField = keyof StoreFormValues;

/** Form field → validation message. */
export type StoreFormErrors = Partial<Record<StoreFormField, string>>;

export const EMPTY_STORE_FORM: StoreFormValues = {
  name: "",
  categoryIds: [],
  latitude: null,
  longitude: null,
  deliveryFee: "",
  logoFile: null,
  coverFile: null,
};

/** Maps a loaded store onto editable form values. */
export function toFormValues(store: Store): StoreFormValues {
  return {
    name: store.name,
    categoryIds: store.categories.map((category) => category.id),
    latitude: store.latitude,
    longitude: store.longitude,
    deliveryFee: store.delivery_fee?.toString() ?? "",
    logoFile: null,
    coverFile: null,
  };
}
