export interface RealtimeCredentials {
  url: string;
  channel: string;
  key: string;
  expiresAt: string;
}

export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "unavailable";

export interface EmitterConnectionHandlers {
  onMessage: (payload: unknown) => void;
  onLive: () => void;
  onStatus: (status: ConnectionStatus) => void;
}

export interface EmitterConnectionOptions extends EmitterConnectionHandlers {
  getCredentials: (signal: AbortSignal) => Promise<RealtimeCredentials>;
  isUnavailable?: (error: unknown) => boolean;
  connect?: MqttConnect;
}

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

export const RENEW_BEFORE_EXPIRY_MS = 5 * 60_000;
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const UNAVAILABLE_RETRY_MS = 60_000;
const RENEW_RETRY_MS = 60_000;
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
      protocolVersion: 4,
      clean: true,
      keepalive: 30,
      connectTimeout: 10_000,
      reconnectPeriod: 0,
      resubscribe: false,
    });
    client = connection;

    connection.on("connect", () => {
      connection.subscribe(`${current.key}/${current.channel}`, { qos: 0 }, (error, granted) => {
        if (client !== connection) return;
        if (error || granted?.[0]?.qos === SUBSCRIBE_REFUSED) {
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
      if (client !== connection || topic !== current.channel) return;
      try {
        onMessage(JSON.parse(payload.toString()));
      } catch {
      }
    });

    connection.on("error", () => {});
    connection.on("close", () => {
      if (client !== connection) return;
      dropClient();
      setStatus("reconnecting");
      scheduleRetry();
    });
  }

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
