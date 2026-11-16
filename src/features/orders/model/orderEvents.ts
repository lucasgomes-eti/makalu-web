import { Order, ORDER_STATUSES, OrderStatus } from "./order.types";

export interface OrderEvent {
  type: "order.created" | "order.status_changed";
  orderId: number;
  storeId: number;
  status: OrderStatus;
  updatedAt: string;
}

const SUPPORTED_VERSION = 1;
const EVENT_TYPES: readonly string[] = ["order.created", "order.status_changed"];

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

export function isNewer(a: string, b: string): boolean {
  const [timeA, timeB] = [Date.parse(a), Date.parse(b)];
  if (Number.isNaN(timeA) || Number.isNaN(timeB)) return false;
  if (timeA !== timeB) return timeA > timeB;
  const fraction = (value: string) => (TIMESTAMP.exec(value)?.[2] ?? "").padEnd(9, "0");
  return fraction(a) > fraction(b);
}

export interface RemoteChange {
  status: OrderStatus;
  updatedAt: string;
}

export type OrderEventOutcome =
  | { kind: "apply"; change: RemoteChange }
  | { kind: "refetch"; isNewOrder: boolean }
  | { kind: "ignore" };

export function resolveOrderEvent(
  shown: Order | undefined,
  event: OrderEvent,
): OrderEventOutcome {
  if (!shown) return { kind: "refetch", isNewOrder: event.type === "order.created" };
  if (!isNewer(event.updatedAt, shown.updated_at)) return { kind: "ignore" };
  return { kind: "apply", change: { status: event.status, updatedAt: event.updatedAt } };
}

export function withRemoteChange(order: Order, change: RemoteChange | undefined): Order {
  if (!change || !isNewer(change.updatedAt, order.updated_at)) return order;
  return { ...order, status: change.status, updated_at: change.updatedAt };
}
