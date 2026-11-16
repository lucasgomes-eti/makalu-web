import { Order, ORDER_STATUSES, OrderStatus } from "./order.types";

/**
 * Moves a store manager may make on the board — a subset of what the API allows
 * (`OrderStatus.kt`).
 *
 * Finishing is the customer's move when the order arrives. The manager may only
 * finish an order the customer left in route for
 * {@link HOURS_IN_ROUTE_BEFORE_MANAGER_MAY_FINISH} hours. `FINISHED` and `CANCELLED`
 * are terminal.
 */
const MANAGER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_ROUTE", "CANCELLED"],
  IN_ROUTE: ["CANCELLED"],
  FINISHED: [],
  CANCELLED: [],
};

export const HOURS_IN_ROUTE_BEFORE_MANAGER_MAY_FINISH = 12;
const MILLISECONDS_PER_HOUR = 3_600_000;

function wasLeftInRouteByTheCustomer(order: MovableOrder, now: Date): boolean {
  const hoursSinceLastChange =
    (now.getTime() - Date.parse(order.updated_at)) / MILLISECONDS_PER_HOUR;
  return (
    order.status === "IN_ROUTE" &&
    hoursSinceLastChange >= HOURS_IN_ROUTE_BEFORE_MANAGER_MAY_FINISH
  );
}

type MovableOrder = Pick<Order, "status" | "updated_at">;

export function canMoveOrder(
  order: MovableOrder,
  to: OrderStatus,
  now: Date = new Date(),
): boolean {
  if (MANAGER_TRANSITIONS[order.status].includes(to)) return true;
  return to === "FINISHED" && wasLeftInRouteByTheCustomer(order, now);
}

export type OrderBoardColumns = Record<OrderStatus, Order[]>;

/**
 * Buckets orders by status, preserving the API's newest-first order within each
 * column.
 */
export function groupOrdersByStatus(orders: Order[]): OrderBoardColumns {
  const columns = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, [] as Order[]]),
  ) as OrderBoardColumns;

  for (const order of orders) {
    // An unknown status from a newer API is left off the board rather than crashing it.
    columns[order.status]?.push(order);
  }
  return columns;
}

export interface ConfigurationSummary {
  id: number;
  name: string;
  options: string;
}

/**
 * One line per configuration the customer chose something in, e.g.
 * `{ id, name: "Extras", options: "Bacon (2x), Cheese" }`.
 *
 * The order payload does not say which configurations are quantity-based, so a
 * quantity is shown whenever it is above one.
 */
export function describeItemConfigurations(
  item: Order["items"][number],
): ConfigurationSummary[] {
  return item.configurations
    .filter((configuration) => configuration.options.length > 0)
    .map((configuration) => ({
      id: configuration.id,
      name: configuration.name,
      options: configuration.options
        .map((option) =>
          option.quantity > 1 ? `${option.name} (${option.quantity}x)` : option.name,
        )
        .join(", "),
    }));
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** When the order was placed: just the time for today, date and time otherwise. */
export function formatOrderTime(isoDate: string, now: Date = new Date()): string {
  const placedAt = new Date(isoDate);
  if (Number.isNaN(placedAt.getTime())) return "";
  return placedAt.toDateString() === now.toDateString()
    ? timeFormatter.format(placedAt)
    : dateTimeFormatter.format(placedAt);
}
