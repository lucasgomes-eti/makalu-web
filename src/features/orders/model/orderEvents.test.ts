import { describe, expect, it } from "vitest";
import { order } from "@/test/orders";
import {
  isNewer,
  OrderEvent,
  parseOrderEvent,
  resolveOrderEvent,
  withRemoteChange,
} from "./orderEvents";

const message = (overrides: Record<string, unknown> = {}) => ({
  v: 1,
  type: "order.status_changed",
  orderId: "42",
  storeId: "7",
  status: "ACCEPTED",
  updatedAt: "2026-11-13T18:04:11Z",
  ...overrides,
});

const event = (overrides: Partial<OrderEvent> = {}): OrderEvent => ({
  type: "order.status_changed",
  orderId: 1,
  storeId: 7,
  status: "ACCEPTED",
  updatedAt: "2026-09-30T12:05:00Z",
  ...overrides,
});

describe("parseOrderEvent", () => {
  it("reads an event, turning the ids into numbers", () => {
    expect(parseOrderEvent(message())).toEqual({
      type: "order.status_changed",
      orderId: 42,
      storeId: 7,
      status: "ACCEPTED",
      updatedAt: "2026-11-13T18:04:11Z",
    });
  });

  it.each([
    ["a newer version", { v: 2 }],
    ["a type it does not know", { type: "order.refunded" }],
    ["a status it does not know", { status: "ON_HOLD" }],
    ["an id that is not a number", { orderId: "abc" }],
    ["a missing timestamp", { updatedAt: undefined }],
  ])("reports %s as unknown, so the caller refetches", (_name, overrides) => {
    expect(parseOrderEvent(message(overrides))).toBe("unknown");
  });

  it.each([null, "text", 42, {}, { type: "order.created" }])(
    "discards %j, which is not an order event",
    (payload) => {
      expect(parseOrderEvent(payload)).toBeNull();
    },
  );
});

describe("isNewer", () => {
  it.each([
    ["2026-11-13T18:04:12Z", "2026-11-13T18:04:11Z", true],
    ["2026-11-13T18:04:11Z", "2026-11-13T18:04:12Z", false],
    ["2026-11-13T18:04:11Z", "2026-11-13T18:04:11Z", false],
    // Same millisecond: only the microseconds tell them apart.
    ["2026-11-13T18:04:11.123457Z", "2026-11-13T18:04:11.123456Z", true],
    ["2026-11-13T18:04:11.123456Z", "2026-11-13T18:04:11.123457Z", false],
    ["2026-11-13T18:04:11.123456Z", "2026-11-13T18:04:11.123456Z", false],
    ["2026-11-13T18:04:11.1Z", "2026-11-13T18:04:11Z", true],
    ["2026-11-13T18:04:11.100Z", "2026-11-13T18:04:11.1Z", false],
    ["not a date", "2026-11-13T18:04:11Z", false],
    ["2026-11-13T18:04:11Z", "not a date", false],
  ])("isNewer(%s, %s) is %s", (a, b, expected) => {
    expect(isNewer(a, b)).toBe(expected);
  });
});

describe("resolveOrderEvent", () => {
  const shown = order({ id: 1, status: "PENDING", updated_at: "2026-09-30T12:00:00Z" });

  it("applies a status change newer than what is shown", () => {
    expect(resolveOrderEvent(shown, event())).toEqual({
      kind: "apply",
      change: { status: "ACCEPTED", updatedAt: "2026-09-30T12:05:00Z" },
    });
  });

  it("ignores an event older than what is shown", () => {
    expect(resolveOrderEvent(shown, event({ updatedAt: "2026-09-30T11:00:00Z" }))).toEqual({
      kind: "ignore",
    });
  });

  it("ignores an event as old as what is shown: it is the echo of something already known", () => {
    expect(resolveOrderEvent(shown, event({ updatedAt: shown.updated_at }))).toEqual({
      kind: "ignore",
    });
  });

  it("refetches for a created order that is not on the board, marking it as new", () => {
    expect(resolveOrderEvent(undefined, event({ type: "order.created" }))).toEqual({
      kind: "refetch",
      isNewOrder: true,
    });
  });

  it("refetches for a change to an order that is not on the board", () => {
    expect(resolveOrderEvent(undefined, event())).toEqual({ kind: "refetch", isNewOrder: false });
  });

  it("ignores a creation event for an order already on the board", () => {
    expect(
      resolveOrderEvent(shown, event({ type: "order.created", status: "PENDING", updatedAt: shown.updated_at })),
    ).toEqual({ kind: "ignore" });
  });
});

describe("withRemoteChange", () => {
  const fetched = order({ id: 1, status: "PENDING", updated_at: "2026-09-30T12:00:00Z" });

  it("shows the change when it is newer than the fetched order", () => {
    expect(
      withRemoteChange(fetched, { status: "ACCEPTED", updatedAt: "2026-09-30T12:05:00Z" }),
    ).toEqual({ ...fetched, status: "ACCEPTED", updated_at: "2026-09-30T12:05:00Z" });
  });

  it("drops the change once a fetch has caught up with it", () => {
    const caughtUp = { ...fetched, status: "IN_ROUTE" as const, updated_at: "2026-09-30T12:09:00Z" };

    expect(withRemoteChange(caughtUp, { status: "ACCEPTED", updatedAt: "2026-09-30T12:05:00Z" })).toBe(caughtUp);
  });

  it("returns the order untouched when nothing was reported for it", () => {
    expect(withRemoteChange(fetched, undefined)).toBe(fetched);
  });
});
