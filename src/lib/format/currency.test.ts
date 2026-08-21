import { describe, expect, it } from "vitest";
import { formatCurrency, formatSurcharge, parseAmount } from "./currency";

describe("formatCurrency", () => {
  it("formats an amount with two decimals", () => {
    expect(formatCurrency(12.5)).toBe("$12.50");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("groups thousands", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });
});

describe("formatSurcharge", () => {
  it("prefixes a positive surcharge with a plus sign", () => {
    expect(formatSurcharge(1.5)).toBe("+$1.50");
  });

  it("returns nothing when there is no surcharge", () => {
    expect(formatSurcharge(0)).toBe("");
  });
});

describe("parseAmount", () => {
  it.each([
    ["12.34", 12.34],
    ["0", 0],
    ["", 0],
    ["abc", 0],
  ])("parses %j as %d", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});
