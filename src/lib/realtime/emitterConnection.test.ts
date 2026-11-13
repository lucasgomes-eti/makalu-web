import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConnectionStatus,
  MqttConnect,
  openEmitterConnection,
  RealtimeCredentials,
  RENEW_BEFORE_EXPIRY_MS,
} from "./emitterConnection";

type Listener = (...args: unknown[]) => void;

/** A scriptable stand-in for an MQTT.js client. */
class FakeClient {
  listeners: Record<string, Listener[]> = {};
  subscriptions: string[] = [];
  ended = false;
  private subscribeCallback?: (error: Error | null, granted?: { qos: number }[]) => void;

  constructor(
    public url: string,
    public options: Record<string, unknown>,
  ) {}

  on(event: string, listener: (...args: never[]) => void) {
    (this.listeners[event] ??= []).push(listener as Listener);
    return this;
  }

  subscribe(topic: string, _options: unknown, callback: FakeClient["subscribeCallback"]) {
    this.subscriptions.push(topic);
    this.subscribeCallback = callback;
    return this;
  }

  end() {
    this.ended = true;
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners[event]?.forEach((listener) => listener(...args));
  }

  /** The broker accepts the connection and answers the subscribe. */
  accept(qos = 0) {
    this.emit("connect");
    this.subscribeCallback?.(null, [{ qos }]);
  }

  deliver(topic: string, payload: string) {
    this.emit("message", topic, Buffer.from(payload));
  }
}

const NOW = Date.parse("2026-11-13T12:00:00Z");

function credentials(overrides: Partial<RealtimeCredentials> = {}): RealtimeCredentials {
  return {
    url: "wss://broker.test/",
    channel: "makalu/store/7/orders/",
    key: "read-key",
    expiresAt: new Date(NOW + 24 * 3_600_000).toISOString(),
    ...overrides,
  };
}

function setup(getCredentials = vi.fn(async () => credentials())) {
  const clients: FakeClient[] = [];
  const connect: MqttConnect = (url, options) => {
    const client = new FakeClient(url, options);
    clients.push(client);
    return client;
  };
  const statuses: ConnectionStatus[] = [];
  const onMessage = vi.fn();
  const onLive = vi.fn();
  const connection = openEmitterConnection({
    getCredentials,
    connect,
    onMessage,
    onLive,
    onStatus: (status) => statuses.push(status),
    isUnavailable: (error) => (error as { status?: number }).status === 503,
  });
  return { clients, statuses, onMessage, onLive, connection, getCredentials };
}

/** Lets pending promises settle without moving the clock. */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe("openEmitterConnection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(Math, "random").mockReturnValue(1);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("connects with MQTT 3.1.1 and subscribes to the channel with the key", async () => {
    const { clients, statuses, onLive } = setup();
    await settle();

    expect(clients[0].url).toBe("wss://broker.test/");
    expect(clients[0].options).toMatchObject({ protocolVersion: 4, clean: true, reconnectPeriod: 0 });
    expect(statuses).toEqual(["connecting"]);

    clients[0].accept();

    expect(clients[0].subscriptions).toEqual(["read-key/makalu/store/7/orders/"]);
    expect(statuses).toEqual(["connecting", "live"]);
    expect(onLive).toHaveBeenCalledTimes(1);
  });

  it("passes on JSON messages from its channel and nothing else", async () => {
    const { clients, onMessage } = setup();
    await settle();
    clients[0].accept();

    clients[0].deliver("makalu/store/7/orders/", '{"v":1,"type":"order.created"}');
    clients[0].deliver("emitter/error/", '{"status":401}');
    clients[0].deliver("makalu/store/7/orders/", "not json");

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ v: 1, type: "order.created" });
  });

  it("reconnects with backoff and reports live again, so the caller can resync", async () => {
    const { clients, statuses, onLive } = setup();
    await settle();
    clients[0].accept();

    clients[0].emit("close");
    expect(statuses.at(-1)).toBe("reconnecting");
    expect(clients).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(clients).toHaveLength(2);
    clients[1].accept();

    expect(statuses.at(-1)).toBe("live");
    expect(onLive).toHaveBeenCalledTimes(2);
  });

  it("waits longer after each failed attempt, up to 30 seconds", async () => {
    const { clients } = setup();
    await settle();

    const waits: number[] = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      clients.at(-1)!.emit("close");
      const before = clients.length;
      let waited = 0;
      while (clients.length === before) {
        await vi.advanceTimersByTimeAsync(500);
        waited += 500;
      }
      waits.push(waited);
    }

    expect(waits).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000]);
  });

  it("asks for new credentials when the broker refuses the subscription", async () => {
    const getCredentials = vi
      .fn()
      .mockResolvedValueOnce(credentials({ key: "stale-key" }))
      .mockResolvedValueOnce(credentials({ key: "fresh-key" }));
    const { clients, statuses, onLive } = setup(getCredentials);
    await settle();

    clients[0].accept(0x80);
    expect(clients[0].ended).toBe(true);
    expect(statuses.at(-1)).toBe("reconnecting");
    expect(onLive).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    clients[1].accept();

    expect(getCredentials).toHaveBeenCalledTimes(2);
    expect(clients[1].subscriptions).toEqual(["fresh-key/makalu/store/7/orders/"]);
    expect(statuses.at(-1)).toBe("live");
  });

  it("reuses valid credentials when it merely reconnects", async () => {
    const { clients, getCredentials } = setup();
    await settle();
    clients[0].accept();

    clients[0].emit("close");
    await vi.advanceTimersByTimeAsync(1_000);

    expect(clients).toHaveLength(2);
    expect(getCredentials).toHaveBeenCalledTimes(1);
  });

  it("renews the credentials before they expire, without dropping the subscription", async () => {
    const getCredentials = vi
      .fn()
      .mockResolvedValueOnce(credentials({ key: "first", expiresAt: new Date(NOW + 3_600_000).toISOString() }))
      .mockResolvedValue(credentials({ key: "second", expiresAt: new Date(NOW + 2 * 24 * 3_600_000).toISOString() }));
    const { clients } = setup(getCredentials);
    await settle();
    clients[0].accept();

    await vi.advanceTimersByTimeAsync(3_600_000 - RENEW_BEFORE_EXPIRY_MS - 1_000);
    expect(getCredentials).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(getCredentials).toHaveBeenCalledTimes(2);
    expect(clients).toHaveLength(1);
    expect(clients[0].ended).toBe(false);

    // The renewed key is what the next reconnect uses.
    clients[0].emit("close");
    await vi.advanceTimersByTimeAsync(1_000);
    clients[1].accept();
    expect(clients[1].subscriptions).toEqual(["second/makalu/store/7/orders/"]);
  });

  it("fetches credentials again when the ones it holds are about to expire", async () => {
    const getCredentials = vi
      .fn()
      .mockResolvedValueOnce(credentials({ expiresAt: new Date(NOW + 60_000).toISOString() }))
      .mockResolvedValue(credentials());
    const { clients } = setup(getCredentials);
    await settle();
    expect(getCredentials).toHaveBeenCalledTimes(1);

    clients[0].emit("close");
    await vi.advanceTimersByTimeAsync(1_000);

    expect(getCredentials).toHaveBeenCalledTimes(2);
  });

  it("reports realtime as unavailable when the API says it is off, and checks back later", async () => {
    const getCredentials = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue(credentials());
    const { clients, statuses } = setup(getCredentials);
    await settle();

    expect(statuses.at(-1)).toBe("unavailable");
    expect(clients).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(clients).toHaveLength(1);
  });

  it("keeps retrying when the credentials request fails for another reason", async () => {
    const getCredentials = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(credentials());
    const { clients, statuses } = setup(getCredentials);
    await settle();

    expect(statuses.at(-1)).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(clients).toHaveLength(1);
  });

  it("retries at once when the browser comes back online", async () => {
    const { clients } = setup();
    await settle();
    for (let i = 0; i < 4; i += 1) {
      clients.at(-1)!.emit("close");
      await vi.advanceTimersByTimeAsync(30_000);
    }
    clients.at(-1)!.emit("close");
    const before = clients.length;

    window.dispatchEvent(new Event("online"));
    await settle();

    expect(clients).toHaveLength(before + 1);
  });

  it("stops everything when closed", async () => {
    const { clients, statuses, onMessage, connection } = setup();
    await settle();
    clients[0].accept();

    connection.close();
    clients[0].emit("close");
    clients[0].deliver("makalu/store/7/orders/", "{}");
    await vi.advanceTimersByTimeAsync(120_000);

    expect(clients).toHaveLength(1);
    expect(clients[0].ended).toBe(true);
    expect(statuses).toEqual(["connecting", "live"]);
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("does not connect if it is closed while the credentials are loading", async () => {
    const { clients, connection } = setup();

    connection.close();
    await settle();

    expect(clients).toHaveLength(0);
  });
});
