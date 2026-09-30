import http from "@/lib/api/httpClient";
import { Order } from "../model/order.types";

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
