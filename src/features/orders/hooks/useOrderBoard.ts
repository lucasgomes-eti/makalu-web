"use client";

import { useCallback, useMemo, useState } from "react";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useSelectedStore } from "@/features/stores/context/SelectedStoreProvider";
import { listStoreOrders } from "../api/ordersApi";
import { Order, OrderStatus } from "../model/order.types";
import { canMoveOrder, groupOrdersByStatus } from "../model/orderBoard";

interface StoreOrders {
  storeId: number;
  orders: Order[];
}

interface LocalMoves {
  /** The fetch these moves were made against; a new fetch discards them. */
  basis: StoreOrders | undefined;
  statuses: Record<number, OrderStatus>;
}

const NO_MOVES: Record<number, OrderStatus> = {};

/**
 * Use cases: *see the selected store's orders as a board*, *refresh it*, and *move
 * an order to another status*.
 *
 * Moves are local only for now — there is no status endpoint yet, so a refresh
 * (or switching store) shows the server's statuses again.
 */
export function useOrderBoard() {
  const { selectedStoreId } = useSelectedStore();

  const loadOrders = useCallback(
    async (signal: AbortSignal): Promise<StoreOrders> => {
      const storeId = selectedStoreId as number;
      return { storeId, orders: await listStoreOrders(storeId, signal) };
    },
    [selectedStoreId],
  );

  const orders = useAsyncData(loadOrders, {
    enabled: selectedStoreId !== null,
    errorMessage: "Could not load orders.",
  });

  const [moves, setMoves] = useState<LocalMoves>({ basis: undefined, statuses: {} });
  const statuses = moves.basis === orders.data ? moves.statuses : NO_MOVES;

  const columns = useMemo(
    () =>
      groupOrdersByStatus(
        (orders.data?.orders ?? []).map((order) =>
          order.id in statuses ? { ...order, status: statuses[order.id] } : order,
        ),
      ),
    [orders.data, statuses],
  );

  const moveOrder = useCallback(
    (order: Order, to: OrderStatus) => {
      if (!canMoveOrder(order.status, to)) return;
      setMoves((previous) => ({
        basis: orders.data,
        statuses: {
          ...(previous.basis === orders.data ? previous.statuses : {}),
          [order.id]: to,
        },
      }));
    },
    [orders.data],
  );

  // Data from this store is on screen: keep showing it while a refresh runs,
  // instead of blanking the board. Data from a previous store is not shown at all.
  const hasCurrentData = orders.data?.storeId === selectedStoreId;

  return {
    columns,
    /** Orders for the selected store have loaded at least once. */
    hasData: hasCurrentData,
    isEmpty: hasCurrentData && orders.data?.orders.length === 0,
    moveOrder,
    /** First load for this store — nothing to show yet. */
    isLoading: orders.isLoading && !hasCurrentData,
    /** A refresh of data already on screen. */
    isRefreshing: orders.isLoading && hasCurrentData,
    error: orders.error,
    refresh: orders.reload,
    hasStore: selectedStoreId !== null,
  };
}
