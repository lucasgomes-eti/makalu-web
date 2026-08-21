import { parseAmount } from "@/lib/format/currency";
import { StoreFormErrors, StoreFormValues } from "./store.types";

/**
 * Client-side rules for the store form. Pure, so it is trivially testable and can run
 * before any request is made.
 *
 * The server validates independently; its `field_errors` are merged on top of these
 * by `useStoreForm`.
 */
export function validateStore(values: StoreFormValues): StoreFormErrors {
  const errors: StoreFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  if (values.categoryIds.length === 0) {
    errors.categoryIds = "Select at least one category.";
  }

  if (values.latitude === null || values.longitude === null) {
    errors.latitude = "Pick the store location on the map.";
  }

  if (parseAmount(values.deliveryFee) <= 0) {
    errors.deliveryFee = "Delivery fee must be greater than 0.";
  }

  return errors;
}

/** Field names as the API reports them, mapped onto form fields. */
const API_FIELD_TO_FORM_FIELD: Record<string, keyof StoreFormErrors> = {
  name: "name",
  categoriesIds: "categoryIds",
  categories_ids: "categoryIds",
  delivery_fee: "deliveryFee",
  latitude: "latitude",
  longitude: "longitude",
};

/** Translates server-side `field_errors` into form-field errors. */
export function toStoreFormErrors(
  fieldErrors: Record<string, string>,
): StoreFormErrors {
  const errors: StoreFormErrors = {};

  for (const [apiField, message] of Object.entries(fieldErrors)) {
    const formField = API_FIELD_TO_FORM_FIELD[apiField];
    if (formField) errors[formField] = message;
  }

  return errors;
}
