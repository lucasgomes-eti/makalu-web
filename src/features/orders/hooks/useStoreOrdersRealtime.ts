"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ConnectionStatus } from "@/lib/realtime/emitterConnection";
import { joinSharedConnection } from "@/lib/realtime/sharedConnection";
import { getStoreRealtimeCredentials } from "../api/realtimeApi";
import { OrderEvent, parseOrderEvent } from "../model/orderEvents";

interface Handlers {
  onEvent: (event: OrderEvent) => void;
  onOutOfSync: () => void;
}

const isRealtimeOff = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 503;

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

  return state.storeId === storeId ? state.status : "connecting";
}
