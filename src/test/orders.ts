import { Order, OrderItem } from "@/features/orders/model/order.types";

/** Builds an order as `GET /orders/stores/{storeId}` returns it. */
export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    status: "PENDING",
    order_number: "1001",
    store_name: "Test Store",
    store_image_id: null,
    delivery_address_line: "12 Main St",
    items: [orderItem()],
    total: { delivery_fee: 5, total: 29.9 },
    created_at: "2026-09-30T12:00:00Z",
    updated_at: "2026-09-30T12:00:00Z",
    ...overrides,
  };
}

export function orderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 1,
    menu_item_id: 3,
    image_id: null,
    name: "Cheeseburger",
    price: 24.9,
    notes: null,
    configurations: [],
    ...overrides,
  };
}
