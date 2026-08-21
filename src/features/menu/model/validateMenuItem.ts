import { parseAmount } from "@/lib/format/currency";
import { MenuItemFormErrors, MenuItemFormValues } from "./menuItem.types";

/** Client-side rules for the menu item form. Pure and independently testable. */
export function validateMenuItem(
  values: MenuItemFormValues,
): MenuItemFormErrors {
  const errors: MenuItemFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!values.category.trim()) {
    errors.category = "Category is required.";
  }

  if (parseAmount(values.price) <= 0) {
    errors.price = "Price must be greater than 0.";
  }

  return errors;
}
