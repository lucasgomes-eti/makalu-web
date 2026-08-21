/** How a customer picks among a configuration's options. */
export const CONFIGURATION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "QUANTITY",
] as const;

export type ConfigurationType = (typeof CONFIGURATION_TYPES)[number];

export const CONFIGURATION_TYPE_LABELS: Record<ConfigurationType, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  QUANTITY: "Quantity",
};

/** One selectable option, e.g. "Extra cheese" at +$1.50. */
export interface Option {
  name: string;
  additional_price: number;
}

/** A named group of options attached to a menu item, e.g. "Size". */
export interface Configuration {
  name: string;
  type: ConfigurationType;
  options: Option[];
}

export interface MenuItem {
  id: number;
  store_id: number;
  name: string;
  category: string;
  price: number;
  ingredients: string;
  configurations: Configuration[];
  image_id: number | null;
}

/** Write payload for creating and updating a menu item. */
export interface MenuItemRequest {
  name: string;
  category: string;
  price: number;
  ingredients: string;
  configurations: Configuration[];
}

/**
 * A configuration while it is being edited.
 *
 * `key` is a client-only identity so React can track rows across insertions and
 * deletions. Using the array index made removing a middle row shift every input
 * below it onto the wrong data.
 */
export interface ConfigurationDraft extends Configuration {
  key: string;
}

export interface MenuItemFormValues {
  name: string;
  category: string;
  /** Kept as a string so the number input can be empty mid-edit. */
  price: string;
  ingredients: string;
  configurations: ConfigurationDraft[];
  imageFile: File | null;
}

export type MenuItemFormErrors = Partial<
  Record<"name" | "category" | "price", string>
>;

let draftCounter = 0;

/** Generates a stable client-side key for a configuration row. */
export function nextDraftKey(): string {
  draftCounter += 1;
  return `configuration-${draftCounter}`;
}

export function newConfiguration(): ConfigurationDraft {
  return {
    key: nextDraftKey(),
    name: "",
    type: "SINGLE_CHOICE",
    options: [],
  };
}

export const EMPTY_MENU_ITEM_FORM: MenuItemFormValues = {
  name: "",
  category: "",
  price: "",
  ingredients: "",
  configurations: [],
  imageFile: null,
};

/** Maps a loaded menu item onto editable form values. */
export function toFormValues(item: MenuItem): MenuItemFormValues {
  return {
    name: item.name,
    category: item.category,
    price: String(item.price),
    ingredients: item.ingredients ?? "",
    configurations: (item.configurations ?? []).map((configuration) => ({
      ...configuration,
      key: nextDraftKey(),
    })),
    imageFile: null,
  };
}
