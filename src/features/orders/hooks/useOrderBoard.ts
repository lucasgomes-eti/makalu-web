"use client";

import { useCallback, useMemo, useState } from "react";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useSelectedStore } from "@/features/stores/context/SelectedStoreProvider";
import { listStoreOrders, updateOrderStatus } from "../api/ordersApi";
import { Order, OrderStatus } from "../model/order.types";
import { canMoveOrder, groupOrdersByStatus } from "../model/orderBoard";

interface StoreOrders {
  storeId: number;
  orders: Order[];
}

interface LocalMoves {
  /** The fetch these moves were made against; a new fetch discards them. */
  basis: StoreOrders | undefined;
  /** Order id → the order as it should be shown: optimistic, then the server's. */
  orders: Record<number, Order>;
}

const NO_MOVES: Record<number, Order> = {};

/** Statuses meaning the board is out of date: the order changed or is gone. */
const STALE_BOARD_STATUSES = [400, 404];

/**
 * Use cases: *see the selected store's orders as a board*, *refresh it*, and *move
 * an order to another status*.
 *
 * A move shows at once and is sent to the API; the order the API returns replaces
 * it, and a rejected move is rolled back. A refresh (or switching store) shows the
 * server's statuses again.
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
  const { reload } = orders;

  const changeStatus = useAsyncAction(updateOrderStatus, "Could not move the order.");
  const { run: runChangeStatus } = changeStatus;

  const [moves, setMoves] = useState<LocalMoves>({ basis: undefined, orders: {} });
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set());
  const moved = moves.basis === orders.data ? moves.orders : NO_MOVES;

  const columns = useMemo(
    () =>
      groupOrdersByStatus(
        (orders.data?.orders ?? []).map((order) => moved[order.id] ?? order),
      ),
    [orders.data, moved],
  );

  const moveOrder = useCallback(
    async (order: Order, to: OrderStatus) => {
      if (!canMoveOrder(order.status, to) || pendingIds.has(order.id)) return;

      const basis = orders.data;
      setMoves((previous) => ({
        basis,
        orders: {
          ...(previous.basis === basis ? previous.orders : {}),
          [order.id]: { ...order, status: to },
        },
      }));
      /** Settles the move: the server's order, or `undefined` to roll back. */
      const settle = (settled: Order | undefined) =>
        setMoves((previous) => {
          // Moves were made against newer data since; this one no longer applies.
          if (previous.basis !== basis) return previous;
          const next = { ...previous.orders };
          if (settled) next[order.id] = settled;
          else delete next[order.id];
          return { basis, orders: next };
        });
      const setPending = (pending: boolean) =>
        setPendingIds((previous) => {
          const next = new Set(previous);
          if (pending) next.add(order.id);
          else next.delete(order.id);
          return next;
        });

      setPending(true);
      const result = await runChangeStatus(order.id, to);
      setPending(false);

      if (result.ok) {
        settle(result.value);
        return;
      }
      settle(undefined);
      if (STALE_BOARD_STATUSES.includes(result.error.status)) reload();
    },
    [orders.data, pendingIds, runChangeStatus, reload],
  );

  const isMovePending = useCallback(
    (order: Order) => pendingIds.has(order.id),
    [pendingIds],
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
    /** A move of this order is waiting for the API. */
    isMovePending,
    /** Why the last move was rejected; the order is back where it was. */
    moveError: changeStatus.error,
    dismissMoveError: changeStatus.clearError,
    /** First load for this store — nothing to show yet. */
    isLoading: orders.isLoading && !hasCurrentData,
    /** A refresh of data already on screen. */
    isRefreshing: orders.isLoading && hasCurrentData,
    error: orders.error,
    refresh: orders.reload,
    hasStore: selectedStoreId !== null,
  };
}
