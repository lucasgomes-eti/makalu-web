import { describe, expect, it } from "vitest";
import { order, orderItem } from "@/test/orders";
import { OrderStatus } from "./order.types";
import {
  canMoveOrder,
  describeItemConfigurations,
  formatOrderTime,
  groupOrdersByStatus,
} from "./orderBoard";

describe("canMoveOrder", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  const hoursAgo = (hours: number) =>
    new Date(now.getTime() - hours * 3_600_000).toISOString();
  const canMove = (from: OrderStatus, to: OrderStatus, lastChangedHoursAgo = 0) =>
    canMoveOrder({ status: from, updated_at: hoursAgo(lastChangedHoursAgo) }, to, now);

  it("lets a pending order be accepted or cancelled", () => {
    expect(canMove("PENDING", "ACCEPTED")).toBe(true);
    expect(canMove("PENDING", "CANCELLED")).toBe(true);
  });

  it("sends an accepted order out for delivery", () => {
    expect(canMove("ACCEPTED", "IN_ROUTE")).toBe(true);
  });

  it("lets an order be cancelled until it is delivered", () => {
    expect(canMove("ACCEPTED", "CANCELLED")).toBe(true);
    expect(canMove("IN_ROUTE", "CANCELLED")).toBe(true);
  });

  it("does not skip steps or go backwards", () => {
    expect(canMove("PENDING", "IN_ROUTE")).toBe(false);
    expect(canMove("ACCEPTED", "PENDING")).toBe(false);
    expect(canMove("IN_ROUTE", "ACCEPTED")).toBe(false);
  });

  it("leaves finishing to the customer while the order is fresh", () => {
    expect(canMove("IN_ROUTE", "FINISHED")).toBe(false);
    expect(canMove("IN_ROUTE", "FINISHED", 11.9)).toBe(false);
  });

  it("lets the manager finish an order left in route for twelve hours", () => {
    expect(canMove("IN_ROUTE", "FINISHED", 12)).toBe(true);
    expect(canMove("IN_ROUTE", "FINISHED", 48)).toBe(true);
  });

  it("never lets the manager finish an order that is not in route, however old", () => {
    expect(canMove("PENDING", "FINISHED", 48)).toBe(false);
    expect(canMove("ACCEPTED", "FINISHED", 48)).toBe(false);
  });

  it("treats finished and cancelled orders as final", () => {
    expect(canMove("FINISHED", "PENDING", 48)).toBe(false);
    expect(canMove("CANCELLED", "PENDING", 48)).toBe(false);
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
