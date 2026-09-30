/** Lifecycle of an order, in the order the board shows it. */
export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_ROUTE",
  "FINISHED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  IN_ROUTE: "In route",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
};

/** A chosen option inside one of the item's configurations, e.g. "Large ×1". */
export interface OrderItemOption {
  id: number;
  name: string;
  additional_price: number;
  quantity: number;
}

export interface OrderItemConfiguration {
  id: number;
  name: string;
  options: OrderItemOption[];
}

export interface OrderItem {
  id: number;
  menu_item_id: number;
  image_id: number | null;
  name: string;
  price: number;
  notes: string | null;
  configurations: OrderItemConfiguration[];
}

export interface OrderTotal {
  delivery_fee: number;
  total: number;
}

/** `OrderDetailedResponse` from `GET /orders/stores/{storeId}`. */
export interface Order {
  id: number;
  status: OrderStatus;
  order_number: string;
  store_name: string;
  store_image_id: number | null;
  delivery_address_line: string;
  items: OrderItem[];
  total: OrderTotal;
  created_at: string;
  updated_at: string;
}
