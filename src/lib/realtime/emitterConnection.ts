/** What the API hands out for one channel. The key is read-only and expires. */
export interface RealtimeCredentials {
  /** `wss://` URL of the broker. */
  url: string;
  /** Channel path, ending with a slash, e.g. `makalu/store/7/orders/`. */
  channel: string;
  key: string;
  /** ISO timestamp after which the key is refused for new subscriptions. */
  expiresAt: string;
}

/**
 * - `connecting`: first attempt, nothing has worked yet.
 * - `live`: subscribed; messages arrive.
 * - `reconnecting`: was or should be live, retrying with backoff.
 * - `unavailable`: the API says realtime is off; retried rarely.
 */
export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "unavailable";

export interface EmitterConnectionHandlers {
  /** A JSON message arrived on the channel. */
  onMessage: (payload: unknown) => void;
  /** Subscribed, after the first connect and after every reconnect. */
  onLive: () => void;
  onStatus: (status: ConnectionStatus) => void;
}

export interface EmitterConnectionOptions extends EmitterConnectionHandlers {
  getCredentials: (signal: AbortSignal) => Promise<RealtimeCredentials>;
  /** Whether a failed credentials request means "realtime is off" rather than "try again". */
  isUnavailable?: (error: unknown) => boolean;
  /** Test seam. Defaults to MQTT.js, loaded on demand so it never runs on the server. */
  connect?: MqttConnect;
}

/** The little of an MQTT.js client this module uses. */
export interface MqttLikeClient {
  on(event: "connect" | "close", listener: () => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
  on(
    event: "message",
    listener: (topic: string, payload: { toString(): string }) => void,
  ): unknown;
  subscribe(
    topic: string,
    options: { qos: 0 },
    callback: (error: Error | null, granted?: { qos: number }[]) => void,
  ): unknown;
  end(force?: boolean): unknown;
}

export type MqttConnect = (url: string, options: Record<string, unknown>) => MqttLikeClient;

export interface EmitterConnection {
  close: () => void;
}

/** Fresh credentials are requested this long before the current key expires. */
export const RENEW_BEFORE_EXPIRY_MS = 5 * 60_000;
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const UNAVAILABLE_RETRY_MS = 60_000;
const RENEW_RETRY_MS = 60_000;
/** SUBACK return code for "subscription refused" in MQTT 3.1.1. */
const SUBSCRIBE_REFUSED = 0x80;

async function defaultConnect(): Promise<MqttConnect> {
  const { default: mqtt } = await import("mqtt");
  return (url, options) => mqtt.connect(url, options) as MqttLikeClient;
}

function msUntilRenewal(credentials: RealtimeCredentials): number {
  const expiresAt = Date.parse(credentials.expiresAt);
  if (Number.isNaN(expiresAt)) return 0;
  return expiresAt - Date.now() - RENEW_BEFORE_EXPIRY_MS;
}

/**
 * Keeps one MQTT 3.1.1 subscription to an Emitter channel alive.
 *
 * Emitter delivers at QoS 0 and keeps nothing for an offline client, so a message can
 * always be lost. `onLive` fires on every (re)connect precisely so the caller can
 * refetch the truth over REST; messages in between are only hints.
 *
 * Credentials are fetched again when the key is close to expiring and whenever the
 * broker refuses the subscription. Reconnects back off from 1 s to 30 s.
 */
export function openEmitterConnection(options: EmitterConnectionOptions): EmitterConnection {
  const { getCredentials, onMessage, onLive, onStatus, isUnavailable } = options;
  const abort = new AbortController();
  let closed = false;
  let client: MqttLikeClient | null = null;
  let credentials: RealtimeCredentials | null = null;
  let failures = 0;
  let hasBeenLive = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let renewTimer: ReturnType<typeof setTimeout> | null = null;

  const setStatus = (status: ConnectionStatus) => {
    if (!closed) onStatus(status);
  };

  const dropClient = () => {
    const previous = client;
    client = null;
    previous?.end(true);
  };

  const scheduleRetry = (delay?: number) => {
    if (closed || retryTimer) return;
    const backoff = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** failures);
    failures += 1;
    // Jitter keeps a room full of tabs from reconnecting in step.
    const wait = delay ?? backoff / 2 + Math.random() * (backoff / 2);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void attempt();
    }, wait);
  };

  const scheduleRenewal = () => {
    if (renewTimer) clearTimeout(renewTimer);
    if (!credentials) return;
    renewTimer = setTimeout(
      async () => {
        renewTimer = null;
        if (closed) return;
        try {
          // The running subscription outlives its key; the new one is for the next reconnect.
          credentials = await getCredentials(abort.signal);
          scheduleRenewal();
        } catch {
          if (!closed) renewTimer = setTimeout(scheduleRenewal, RENEW_RETRY_MS);
        }
      },
      Math.max(0, msUntilRenewal(credentials)),
    );
  };

  async function attempt() {
    if (closed) return;
    setStatus(hasBeenLive ? "reconnecting" : "connecting");

    let current: RealtimeCredentials;
    let connect: MqttConnect;
    try {
      if (!credentials || msUntilRenewal(credentials) <= 0) {
        credentials = await getCredentials(abort.signal);
      }
      current = credentials;
      connect = options.connect ?? (await defaultConnect());
    } catch (error) {
      if (closed) return;
      if (isUnavailable?.(error)) {
        setStatus("unavailable");
        scheduleRetry(UNAVAILABLE_RETRY_MS);
      } else {
        setStatus("reconnecting");
        scheduleRetry();
      }
      return;
    }
    if (closed) return;

    const connection = connect(current.url, {
      // Emitter speaks 3.1.1 only: it accepts an MQTT 5 connection, then refuses every subscribe.
      protocolVersion: 4,
      clean: true,
      keepalive: 30,
      connectTimeout: 10_000,
      // Reconnecting is done here, so that every attempt can use fresh credentials.
      reconnectPeriod: 0,
      resubscribe: false,
    });
    client = connection;

    connection.on("connect", () => {
      connection.subscribe(`${current.key}/${current.channel}`, { qos: 0 }, (error, granted) => {
        if (client !== connection) return;
        if (error || granted?.[0]?.qos === SUBSCRIBE_REFUSED) {
          // The key is no longer accepted (expired, or the broker's license was rotated).
          credentials = null;
          dropClient();
          setStatus("reconnecting");
          scheduleRetry();
          return;
        }
        failures = 0;
        hasBeenLive = true;
        setStatus("live");
        scheduleRenewal();
        onLive();
      });
    });

    connection.on("message", (topic, payload) => {
      // Emitter delivers on the channel itself, without the key. Anything else
      // (`emitter/error/`, …) is not ours.
      if (client !== connection || topic !== current.channel) return;
      try {
        onMessage(JSON.parse(payload.toString()));
      } catch {
        // Not JSON: nothing a client can do with it.
      }
    });

    // MQTT.js reports failures through `error` and then closes; `close` drives the retry.
    connection.on("error", () => {});
    connection.on("close", () => {
      if (client !== connection) return;
      dropClient();
      setStatus("reconnecting");
      scheduleRetry();
    });
  }

  /** The network is back: do not sit out the rest of a long backoff. */
  const retryNow = () => {
    if (closed || client || !retryTimer) return;
    clearTimeout(retryTimer);
    retryTimer = null;
    failures = 0;
    void attempt();
  };
  if (typeof window !== "undefined") window.addEventListener("online", retryNow);

  void attempt();

  return {
    close() {
      if (closed) return;
      closed = true;
      abort.abort();
      if (retryTimer) clearTimeout(retryTimer);
      if (renewTimer) clearTimeout(renewTimer);
      if (typeof window !== "undefined") window.removeEventListener("online", retryNow);
      dropClient();
    },
  };
}
