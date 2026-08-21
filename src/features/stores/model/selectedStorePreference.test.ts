import { beforeEach, describe, expect, it } from "vitest";
import { selectedStorePreference } from "./selectedStorePreference";

describe("selectedStorePreference", () => {
  beforeEach(() => sessionStorage.clear());

  it("returns null when nothing was remembered", () => {
    expect(selectedStorePreference.read()).toBeNull();
  });

  it("round-trips a store id as a number", () => {
    selectedStorePreference.write(42);

    expect(selectedStorePreference.read()).toBe(42);
    expect(sessionStorage.getItem("selectedStoreId")).toBe("42");
  });

  it("treats a corrupted value as no preference", () => {
    sessionStorage.setItem("selectedStoreId", "not-a-number");

    expect(selectedStorePreference.read()).toBeNull();
  });

  it("forgets the preference on clear", () => {
    selectedStorePreference.write(42);
    selectedStorePreference.clear();

    expect(selectedStorePreference.read()).toBeNull();
  });
});
