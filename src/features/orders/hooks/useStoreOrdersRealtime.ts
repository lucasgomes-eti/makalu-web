"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ConnectionStatus } from "@/lib/realtime/emitterConnection";
import { joinSharedConnection } from "@/lib/realtime/sharedConnection";
import { getStoreRealtimeCredentials } from "../api/realtimeApi";
import { OrderEvent, parseOrderEvent } from "../model/orderEvents";

interface Handlers {
  /** An event this version understands, for the given store. */
  onEvent: (event: OrderEvent) => void;
  /**
   * The board can no longer be trusted: the connection was just (re)established, so
   * events may have been missed, or an event arrived that cannot be applied.
   */
  onOutOfSync: () => void;
}

/** 503: the API has realtime switched off or cannot reach the broker. */
const isRealtimeOff = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 503;

/**
 * Use case: *be told the moment one of the store's orders changes*.
 *
 * Holds one connection per store and tab (shared by every component using this hook),
 * and returns its status. Handlers may change between renders without reconnecting.
 */
export function useStoreOrdersRealtime(
  storeId: number | null,
  handlers: Handlers,
): ConnectionStatus {
  const [state, setState] = useState<{ storeId: number | null; status: ConnectionStatus }>({
    storeId,
    status: "connecting",
  });
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (storeId === null) return;

    return joinSharedConnection(
      `store-orders:${storeId}`,
      {
        getCredentials: (signal) => getStoreRealtimeCredentials(storeId, signal),
        isUnavailable: isRealtimeOff,
      },
      {
        onStatus: (status) => setState({ storeId, status }),
        onLive: () => latest.current.onOutOfSync(),
        onMessage: (payload) => {
          const event = parseOrderEvent(payload);
          if (event === null) return;
          if (event === "unknown") latest.current.onOutOfSync();
          else if (event.storeId === storeId) latest.current.onEvent(event);
        },
      },
    );
  }, [storeId]);

  // A status reported for the previous store says nothing about this one.
  return state.storeId === storeId ? state.status : "connecting";
}
