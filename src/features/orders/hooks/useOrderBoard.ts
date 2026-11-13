"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useSelectedStore } from "@/features/stores/context/SelectedStoreProvider";
import { listStoreOrders, updateOrderStatus } from "../api/ordersApi";
import { Order, OrderStatus } from "../model/order.types";
import { canMoveOrder, groupOrdersByStatus } from "../model/orderBoard";
import {
  OrderEvent,
  RemoteChange,
  resolveOrderEvent,
  withRemoteChange,
} from "../model/orderEvents";
import { useNewOrderSound } from "./useNewOrderSound";
import { useStoreOrdersRealtime } from "./useStoreOrdersRealtime";

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

interface StoreScoped<T> {
  /** The store these belong to; switching store discards them. */
  storeId: number | null;
  value: T;
}

const NO_MOVES: Record<number, Order> = {};
const NO_CHANGES: Record<number, RemoteChange> = {};
const NO_IDS: ReadonlySet<number> = new Set();

/** Statuses meaning the board is out of date: the order changed or is gone. */
const STALE_BOARD_STATUSES = [400, 404];

/**
 * Use cases: *see the selected store's orders as a board*, *refresh it*, *move an
 * order to another status*, and *see orders arrive and change live*.
 *
 * A move shows at once and is sent to the API; the order the API returns replaces
 * it, and a rejected move is rolled back. A refresh (or switching store) shows the
 * server's statuses again.
 *
 * Realtime events are hints layered over the last fetch, never a second source of
 * truth: a status change is shown from the event, a new order makes the board
 * refetch, and so does every (re)connect, because events may have been missed.
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

  // Status changes reported by events, kept apart from the fetch they arrived after:
  // a fetch that was already in flight may come back older than the event.
  const [remote, setRemote] = useState<StoreScoped<Record<number, RemoteChange>>>({
    storeId: selectedStoreId,
    value: NO_CHANGES,
  });
  const remoteChanges = remote.storeId === selectedStoreId ? remote.value : NO_CHANGES;
  const [arrivals, setArrivals] = useState<StoreScoped<ReadonlySet<number>>>({
    storeId: selectedStoreId,
    value: NO_IDS,
  });
  const newOrderIds = arrivals.storeId === selectedStoreId ? arrivals.value : NO_IDS;

  /** Every order as the board shows it: a move in progress wins, then whatever is newest. */
  const shownOrders = useMemo(
    () =>
      (orders.data?.orders ?? []).map((order) =>
        pendingIds.has(order.id) && moved[order.id]
          ? moved[order.id]
          : withRemoteChange(moved[order.id] ?? order, remoteChanges[order.id]),
      ),
    [orders.data, moved, pendingIds, remoteChanges],
  );

  const columns = useMemo(() => groupOrdersByStatus(shownOrders), [shownOrders]);

  const sound = useNewOrderSound();
  const { play: playNewOrderSound } = sound;
  // Events arrive outside React's render cycle and must see the board as it is now.
  const shownOrdersRef = useRef(shownOrders);
  useEffect(() => {
    shownOrdersRef.current = shownOrders;
  });

  const handleEvent = useCallback(
    (event: OrderEvent) => {
      const shown = shownOrdersRef.current.find((order) => order.id === event.orderId);
      const outcome = resolveOrderEvent(shown, event);

      if (outcome.kind === "apply") {
        setRemote((previous) => ({
          storeId: event.storeId,
          value: {
            ...(previous.storeId === event.storeId ? previous.value : NO_CHANGES),
            [event.orderId]: outcome.change,
          },
        }));
      } else if (outcome.kind === "refetch") {
        if (outcome.isNewOrder) {
          setArrivals((previous) => ({
            storeId: event.storeId,
            value: new Set([
              ...(previous.storeId === event.storeId ? previous.value : NO_IDS),
              event.orderId,
            ]),
          }));
          playNewOrderSound();
        }
        reload();
      }
    },
    [reload, playNewOrderSound],
  );

  const connection = useStoreOrdersRealtime(selectedStoreId, {
    onEvent: handleEvent,
    onOutOfSync: reload,
  });

  const acknowledgeNewOrder = useCallback((order: Order) => {
    setArrivals((previous) => {
      if (!previous.value.has(order.id)) return previous;
      const value = new Set(previous.value);
      value.delete(order.id);
      return { ...previous, value };
    });
  }, []);

  /** Just arrived and not yet dealt with: still pending and not acknowledged. */
  const isNewOrder = useCallback(
    (order: Order) => order.status === "PENDING" && newOrderIds.has(order.id),
    [newOrderIds],
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
    /** The order arrived while the board was open and has not been looked at. */
    isNewOrder,
    acknowledgeNewOrder,
    /** Whether the board is receiving live updates. */
    connection,
    /** The new-order sound: whether it is on, and the switch for it. */
    isSoundEnabled: sound.enabled,
    toggleSound: sound.toggle,
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
