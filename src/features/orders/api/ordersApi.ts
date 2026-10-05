import http from "@/lib/api/httpClient";
import { Order, OrderStatus } from "../model/order.types";

/** A store's orders, newest first. */
export async function listStoreOrders(
  storeId: number,
  signal?: AbortSignal,
): Promise<Order[]> {
  const { data } = await http.get<Order[]>(`/orders/stores/${storeId}`, {
    signal,
  });
  return data;
}

/**
 * Moves an order to `status` and returns the updated order. The API rejects a move
 * its lifecycle forbids (400 `MK-706`) and an unknown order (404 `MK-705`).
 */
export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
): Promise<Order> {
  const { data } = await http.patch<Order>(`/orders/${orderId}/status`, { status });
  return data;
}
