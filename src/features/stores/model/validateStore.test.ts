import { describe, expect, it } from "vitest";
import { EMPTY_STORE_FORM, StoreFormValues } from "./store.types";
import { toStoreFormErrors, validateStore } from "./validateStore";

const valid: StoreFormValues = {
  ...EMPTY_STORE_FORM,
  name: "Makalu Burgers",
  categoryIds: [1],
  latitude: -15.79,
  longitude: -47.88,
  deliveryFee: "4.50",
};

describe("validateStore", () => {
  it("accepts a complete store", () => {
    expect(validateStore(valid)).toEqual({});
  });

  it("requires a name that is not just whitespace", () => {
    expect(validateStore({ ...valid, name: "   " }).name).toBe("Name is required.");
  });

  it("requires at least one category", () => {
    expect(validateStore({ ...valid, categoryIds: [] }).categoryIds).toBeDefined();
  });

  it("requires a location to have been picked", () => {
    expect(validateStore({ ...valid, latitude: null }).latitude).toBeDefined();
    expect(validateStore({ ...valid, longitude: null }).latitude).toBeDefined();
  });

  it("accepts coordinates of exactly zero", () => {
    // A falsy-check on latitude would wrongly reject the equator.
    expect(
      validateStore({ ...valid, latitude: 0, longitude: 0 }).latitude,
    ).toBeUndefined();
  });

  it.each([["", "0", "-1", "abc"]].flat())(
    "rejects a delivery fee of %j",
    (deliveryFee) => {
      expect(validateStore({ ...valid, deliveryFee }).deliveryFee).toBeDefined();
    },
  );

  it("reports every problem at once, not just the first", () => {
    expect(Object.keys(validateStore(EMPTY_STORE_FORM)).sort()).toEqual([
      "categoryIds",
      "deliveryFee",
      "latitude",
      "name",
    ]);
  });
});

describe("toStoreFormErrors", () => {
  it("maps the API's field names onto form fields", () => {
    expect(
      toStoreFormErrors({
        name: "Already taken",
        categoriesIds: "Unknown category",
        delivery_fee: "Too high",
      }),
    ).toEqual({
      name: "Already taken",
      categoryIds: "Unknown category",
      deliveryFee: "Too high",
    });
  });

  it("drops fields the form does not render", () => {
    expect(toStoreFormErrors({ owner_id: "Not allowed" })).toEqual({});
  });
});
