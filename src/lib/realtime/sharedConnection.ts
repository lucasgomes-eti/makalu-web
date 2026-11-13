import {
  ConnectionStatus,
  EmitterConnection,
  EmitterConnectionHandlers,
  EmitterConnectionOptions,
  openEmitterConnection,
} from "./emitterConnection";

interface Shared {
  connection: EmitterConnection;
  status: ConnectionStatus;
  listeners: Set<EmitterConnectionHandlers>;
}

const connections = new Map<string, Shared>();

/**
 * Joins the connection identified by `id`, opening it for the first listener and
 * closing it when the last one leaves — so a tab holds one connection per channel
 * however many components listen.
 *
 * Returns the function that leaves.
 */
export function joinSharedConnection(
  id: string,
  options: Pick<EmitterConnectionOptions, "getCredentials" | "isUnavailable">,
  listener: EmitterConnectionHandlers,
): () => void {
  let shared = connections.get(id);

  if (shared) {
    shared.listeners.add(listener);
    listener.onStatus(shared.status);
    // A listener joining a live connection missed its `onLive`; it still has to sync.
    if (shared.status === "live") listener.onLive();
  } else {
    const listeners = new Set([listener]);
    const created: Shared = {
      status: "connecting",
      listeners,
      connection: openEmitterConnection({
        ...options,
        onMessage: (payload) => listeners.forEach((each) => each.onMessage(payload)),
        onLive: () => listeners.forEach((each) => each.onLive()),
        onStatus: (status) => {
          created.status = status;
          listeners.forEach((each) => each.onStatus(status));
        },
      }),
    };
    shared = created;
    connections.set(id, created);
  }

  const joined = shared;
  return () => {
    joined.listeners.delete(listener);
    if (joined.listeners.size > 0) return;
    joined.connection.close();
    if (connections.get(id) === joined) connections.delete(id);
  };
}
