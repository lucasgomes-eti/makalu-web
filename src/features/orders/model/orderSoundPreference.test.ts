import { describe, expect, it } from "vitest";
import { orderSoundPreference } from "./orderSoundPreference";

describe("orderSoundPreference", () => {
  it("is off until the store turns it on", () => {
    expect(orderSoundPreference.read()).toBe(false);
  });

  it("remembers the choice", () => {
    orderSoundPreference.write(true);
    expect(orderSoundPreference.read()).toBe(true);

    orderSoundPreference.write(false);
    expect(orderSoundPreference.read()).toBe(false);
  });
});
