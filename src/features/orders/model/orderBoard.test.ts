import { describe, expect, it } from "vitest";
import { order, orderItem } from "@/test/orders";
import {
  canMoveOrder,
  describeItemConfigurations,
  formatOrderTime,
  groupOrdersByStatus,
} from "./orderBoard";

describe("canMoveOrder", () => {
  it("lets a pending order be accepted or cancelled", () => {
    expect(canMoveOrder("PENDING", "ACCEPTED")).toBe(true);
    expect(canMoveOrder("PENDING", "CANCELLED")).toBe(true);
  });

  it("sends an accepted order out for delivery", () => {
    expect(canMoveOrder("ACCEPTED", "IN_ROUTE")).toBe(true);
  });

  it("does not skip steps or go backwards", () => {
    expect(canMoveOrder("PENDING", "IN_ROUTE")).toBe(false);
    expect(canMoveOrder("ACCEPTED", "PENDING")).toBe(false);
    expect(canMoveOrder("IN_ROUTE", "ACCEPTED")).toBe(false);
  });

  it("leaves finishing to the customer", () => {
    expect(canMoveOrder("IN_ROUTE", "FINISHED")).toBe(false);
  });

  it("treats finished and cancelled orders as final", () => {
    expect(canMoveOrder("FINISHED", "PENDING")).toBe(false);
    expect(canMoveOrder("CANCELLED", "PENDING")).toBe(false);
  });
});

describe("groupOrdersByStatus", () => {
  it("buckets orders by status, keeping the API's order within a column", () => {
    const columns = groupOrdersByStatus([
      order({ id: 3 }),
      order({ id: 2, status: "ACCEPTED" }),
      order({ id: 1 }),
    ]);

    expect(columns.PENDING.map((o) => o.id)).toEqual([3, 1]);
    expect(columns.ACCEPTED.map((o) => o.id)).toEqual([2]);
    expect(columns.IN_ROUTE).toEqual([]);
    expect(columns.FINISHED).toEqual([]);
    expect(columns.CANCELLED).toEqual([]);
  });

  it("ignores a status it does not know instead of crashing", () => {
    const unknown = { ...order(), status: "REFUNDED" } as unknown as ReturnType<
      typeof order
    >;

    expect(() => groupOrdersByStatus([unknown])).not.toThrow();
  });
});

describe("describeItemConfigurations", () => {
  it("gives each configuration its own named line, with quantities above one", () => {
    const item = orderItem({
      configurations: [
        {
          id: 1,
          name: "Size",
          options: [{ id: 1, name: "Large", additional_price: 3, quantity: 1 }],
        },
        {
          id: 2,
          name: "Extras",
          options: [
            { id: 2, name: "Bacon", additional_price: 2, quantity: 2 },
            { id: 3, name: "Cheese", additional_price: 1, quantity: 1 },
          ],
        },
      ],
    });

    expect(describeItemConfigurations(item)).toEqual([
      { id: 1, name: "Size", options: "Large" },
      { id: 2, name: "Extras", options: "Bacon (2x), Cheese" },
    ]);
  });

  it("skips configurations the customer chose nothing in", () => {
    const item = orderItem({
      configurations: [{ id: 1, name: "Sauces", options: [] }],
    });

    expect(describeItemConfigurations(item)).toEqual([]);
  });
});

describe("formatOrderTime", () => {
  it("shows only the time for an order placed today", () => {
    const now = new Date(2026, 8, 30, 18, 0);
    const placed = new Date(2026, 8, 30, 14, 5);

    expect(formatOrderTime(placed.toISOString(), now)).toBe("02:05 PM");
  });

  it("includes the date for an older order", () => {
    const now = new Date(2026, 8, 30, 18, 0);
    const placed = new Date(2026, 8, 28, 14, 5);

    expect(formatOrderTime(placed.toISOString(), now)).toBe("Sep 28, 02:05 PM");
  });

  it("shows nothing for an unparseable date", () => {
    expect(formatOrderTime("not a date")).toBe("");
  });
});
