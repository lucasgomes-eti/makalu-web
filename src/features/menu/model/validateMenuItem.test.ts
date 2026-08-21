import { describe, expect, it } from "vitest";
import {
  EMPTY_MENU_ITEM_FORM,
  MenuItemFormValues,
  newConfiguration,
  toFormValues,
} from "./menuItem.types";
import { validateMenuItem } from "./validateMenuItem";

const valid: MenuItemFormValues = {
  ...EMPTY_MENU_ITEM_FORM,
  name: "Cheeseburger",
  category: "Burgers",
  price: "24.90",
};

describe("validateMenuItem", () => {
  it("accepts a complete item", () => {
    expect(validateMenuItem(valid)).toEqual({});
  });

  it("requires a name and a category", () => {
    const errors = validateMenuItem({ ...valid, name: " ", category: "" });

    expect(errors.name).toBeDefined();
    expect(errors.category).toBeDefined();
  });

  it.each(["", "0", "-5", "free"])("rejects a price of %j", (price) => {
    expect(validateMenuItem({ ...valid, price }).price).toBeDefined();
  });
});

describe("newConfiguration", () => {
  it("defaults to a single-choice group with no options", () => {
    const configuration = newConfiguration();

    expect(configuration.type).toBe("SINGLE_CHOICE");
    expect(configuration.options).toEqual([]);
  });

  it("gives every configuration a distinct key", () => {
    expect(newConfiguration().key).not.toBe(newConfiguration().key);
  });
});

describe("toFormValues", () => {
  it("keeps the price editable as text", () => {
    const values = toFormValues({
      id: 1,
      store_id: 7,
      name: "Fries",
      category: "Sides",
      price: 9.5,
      ingredients: "Potato, salt",
      configurations: [{ name: "Size", type: "SINGLE_CHOICE", options: [] }],
      image_id: null,
    });

    expect(values.price).toBe("9.5");
    expect(values.configurations[0].key).toBeDefined();
  });

  it("tolerates a null ingredients field from the API", () => {
    const values = toFormValues({
      id: 1,
      store_id: 7,
      name: "Water",
      category: "Drinks",
      price: 4,
      ingredients: null as unknown as string,
      configurations: null as unknown as [],
      image_id: null,
    });

    expect(values.ingredients).toBe("");
    expect(values.configurations).toEqual([]);
  });
});
