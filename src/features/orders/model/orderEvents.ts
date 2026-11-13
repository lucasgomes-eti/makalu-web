import { Order, ORDER_STATUSES, OrderStatus } from "./order.types";

/**
 * A message from the store's realtime channel. It is a hint that something changed,
 * never the source of truth: it can be lost, repeated, or arrive out of order.
 */
export interface OrderEvent {
  type: "order.created" | "order.status_changed";
  orderId: number;
  storeId: number;
  status: OrderStatus;
  /** `updated_at` of the order row after the change. */
  updatedAt: string;
}

const SUPPORTED_VERSION = 1;
const EVENT_TYPES: readonly string[] = ["order.created", "order.status_changed"];

/**
 * Reads a channel message.
 *
 * - an `OrderEvent` when it is one this version understands;
 * - `"unknown"` when it is well-formed but newer than this code (another version, type
 *   or status): something changed that cannot be applied, so the caller refetches;
 * - `null` when it is not an order event at all.
 */
export function parseOrderEvent(payload: unknown): OrderEvent | "unknown" | null {
  if (typeof payload !== "object" || payload === null) return null;
  const message = payload as Record<string, unknown>;
  if (typeof message.v !== "number" || typeof message.type !== "string") return null;

  const orderId = Number(message.orderId);
  const storeId = Number(message.storeId);
  if (
    message.v !== SUPPORTED_VERSION ||
    !EVENT_TYPES.includes(message.type) ||
    !ORDER_STATUSES.includes(message.status as OrderStatus) ||
    !Number.isInteger(orderId) ||
    !Number.isInteger(storeId) ||
    typeof message.updatedAt !== "string"
  ) {
    return "unknown";
  }

  return {
    type: message.type as OrderEvent["type"],
    orderId,
    storeId,
    status: message.status as OrderStatus,
    updatedAt: message.updatedAt,
  };
}

const TIMESTAMP = /^(.*?)(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Whether ISO timestamp `a` is strictly after `b`.
 *
 * The API reports microseconds and `Date` keeps milliseconds, so the fraction is
 * compared digit by digit when the milliseconds tie. An unreadable timestamp is never
 * "newer".
 */
export function isNewer(a: string, b: string): boolean {
  const [timeA, timeB] = [Date.parse(a), Date.parse(b)];
  if (Number.isNaN(timeA) || Number.isNaN(timeB)) return false;
  if (timeA !== timeB) return timeA > timeB;
  const fraction = (value: string) => (TIMESTAMP.exec(value)?.[2] ?? "").padEnd(9, "0");
  return fraction(a) > fraction(b);
}

/** What the board knows from an event that the last fetch does not yet show. */
export interface RemoteChange {
  status: OrderStatus;
  updatedAt: string;
}

export type OrderEventOutcome =
  /** Show the order with this status until a fetch catches up. */
  | { kind: "apply"; change: RemoteChange }
  /** The board cannot be brought up to date from the event alone. */
  | { kind: "refetch"; isNewOrder: boolean }
  /** Already known, or older than what is on screen. */
  | { kind: "ignore" };

/**
 * Decides what an event means for the board, given the order as currently shown
 * (`undefined` when it is not on the board).
 *
 * The event has no order details, so an order the board has never seen can only be
 * shown by refetching.
 */
export function resolveOrderEvent(
  shown: Order | undefined,
  event: OrderEvent,
): OrderEventOutcome {
  if (!shown) return { kind: "refetch", isNewOrder: event.type === "order.created" };
  if (!isNewer(event.updatedAt, shown.updated_at)) return { kind: "ignore" };
  return { kind: "apply", change: { status: event.status, updatedAt: event.updatedAt } };
}

/** `order` as the board should show it, given what events have reported since the fetch. */
export function withRemoteChange(order: Order, change: RemoteChange | undefined): Order {
  if (!change || !isNewer(change.updatedAt, order.updated_at)) return order;
  return { ...order, status: change.status, updated_at: change.updatedAt };
}
