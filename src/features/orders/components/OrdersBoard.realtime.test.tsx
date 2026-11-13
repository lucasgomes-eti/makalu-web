import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test/renderWithProviders";
import { order } from "@/test/orders";
import type { EmitterConnectionOptions } from "@/lib/realtime/emitterConnection";
import { listStoreOrders, updateOrderStatus } from "../api/ordersApi";
import { Order, OrderStatus } from "../model/order.types";
import OrdersBoard from "./OrdersBoard";

vi.mock("../api/ordersApi", () => ({
  listStoreOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}));
vi.mock("../api/realtimeApi", () => ({ getStoreRealtimeCredentials: vi.fn() }));

/** Stands in for the broker connection: the test plays the broker's part. */
const broker = vi.hoisted(() => ({
  opened: [] as { options: EmitterConnectionOptions; close: ReturnType<typeof vi.fn> }[],
}));
vi.mock("@/lib/realtime/emitterConnection", () => ({
  openEmitterConnection: (options: EmitterConnectionOptions) => {
    const close = vi.fn();
    broker.opened.push({ options, close });
    return { close };
  },
}));

const chime = vi.hoisted(() => ({
  unlock: vi.fn(async () => true),
  play: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@/lib/audio/chime", () => ({ createChime: () => chime }));

let selectedStoreId: number | null = 7;
vi.mock("@/features/stores/context/SelectedStoreProvider", () => ({
  useSelectedStore: () => ({ selectedStoreId }),
}));

const mockList = vi.mocked(listStoreOrders);
const mockUpdate = vi.mocked(updateOrderStatus);

const connection = () => broker.opened[broker.opened.length - 1].options;

function goLive() {
  act(() => {
    connection().onStatus("live");
    connection().onLive();
  });
}

function receive(event: Record<string, unknown>) {
  act(() =>
    connection().onMessage({ v: 1, storeId: "7", updatedAt: "2026-09-30T12:05:00Z", ...event }),
  );
}

function column(name: string) {
  return screen.getByRole("region", { name });
}

function card(orderNumber: string) {
  return screen.getByRole("article", { name: `Order ${orderNumber}` });
}

function drag(source: HTMLElement, target: HTMLElement) {
  const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  fireEvent.dragEnd(source, { dataTransfer });
}

async function renderBoard(orders: Order[]) {
  mockList.mockResolvedValue(orders);
  renderWithProviders(<OrdersBoard />);
  if (orders.length > 0) await screen.findByRole("article", { name: `Order ${orders[0].order_number}` });
  else await screen.findByText("No orders yet.");
}

describe("OrdersBoard live updates", () => {
  beforeEach(() => {
    broker.opened.length = 0;
    selectedStoreId = 7;
    mockUpdate.mockImplementation(async (id: number, status: OrderStatus) =>
      order({ id, status, updated_at: "2026-09-30T12:05:00Z" }),
    );
  });

  it("says whether the board is live, reconnecting, or without live updates", async () => {
    await renderBoard([order()]);
    expect(screen.getByRole("status")).toHaveAccessibleName("Live updates: Connecting…");

    goLive();
    expect(screen.getByRole("status")).toHaveAccessibleName("Live updates: Live");

    act(() => connection().onStatus("reconnecting"));
    expect(screen.getByRole("status")).toHaveAccessibleName("Live updates: Reconnecting…");

    act(() => connection().onStatus("unavailable"));
    expect(screen.getByRole("status")).toHaveAccessibleName("Live updates: Live updates off");
  });

  it("refetches the board every time the connection is established", async () => {
    await renderBoard([order()]);
    expect(mockList).toHaveBeenCalledTimes(1);

    goLive();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    act(() => connection().onStatus("reconnecting"));
    goLive();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));
  });

  it("shows a new order the moment it is created, highlighted", async () => {
    await renderBoard([order({ id: 1, order_number: "1001" })]);
    mockList.mockResolvedValue([
      order({ id: 2, order_number: "1002" }),
      order({ id: 1, order_number: "1001" }),
    ]);

    receive({ type: "order.created", orderId: "2", status: "PENDING" });

    const arrived = await within(column("Pending")).findByRole("article", { name: "Order 1002" });
    expect(within(arrived).getByText("New")).toBeInTheDocument();
    expect(within(card("1001")).queryByText("New")).not.toBeInTheDocument();
  });

  it("stops highlighting a new order once the store clicks it", async () => {
    await renderBoard([]);
    mockList.mockResolvedValue([order({ id: 2, order_number: "1002" })]);
    receive({ type: "order.created", orderId: "2", status: "PENDING" });
    const arrived = await screen.findByRole("article", { name: "Order 1002" });

    await userEvent.click(arrived);

    expect(within(arrived).queryByText("New")).not.toBeInTheDocument();
  });

  it("stays silent for a new order until the store turns the sound on", async () => {
    await renderBoard([]);
    mockList.mockResolvedValue([order({ id: 2, order_number: "1002" })]);

    receive({ type: "order.created", orderId: "2", status: "PENDING" });
    await screen.findByRole("article", { name: "Order 1002" });

    expect(chime.play).not.toHaveBeenCalled();
  });

  it("plays a sound for a new order once the store has turned it on, and lets it be muted", async () => {
    await renderBoard([]);

    await userEvent.click(screen.getByRole("button", { name: "Play a sound for new orders" }));
    // Turning it on plays it once, from the click the browser requires.
    await waitFor(() => expect(chime.play).toHaveBeenCalledTimes(1));

    mockList.mockResolvedValue([order({ id: 2, order_number: "1002" })]);
    receive({ type: "order.created", orderId: "2", status: "PENDING" });
    await screen.findByRole("article", { name: "Order 1002" });
    expect(chime.play).toHaveBeenCalledTimes(2);

    await userEvent.click(screen.getByRole("button", { name: "Mute new order sound" }));
    mockList.mockResolvedValue([
      order({ id: 3, order_number: "1003" }),
      order({ id: 2, order_number: "1002" }),
    ]);
    receive({ type: "order.created", orderId: "3", status: "PENDING" });
    await screen.findByRole("article", { name: "Order 1003" });
    expect(chime.play).toHaveBeenCalledTimes(2);
  });

  it("remembers that the sound was turned on", async () => {
    await renderBoard([]);
    await userEvent.click(screen.getByRole("button", { name: "Play a sound for new orders" }));

    expect(localStorage.getItem("orders.newOrderSound")).toBe("on");
  });

  it("moves a card when its status is changed elsewhere, without refetching", async () => {
    await renderBoard([order({ id: 1, order_number: "1001" })]);

    receive({ type: "order.status_changed", orderId: "1", status: "ACCEPTED" });

    expect(within(column("Accepted")).getByRole("article", { name: "Order 1001" })).toBeInTheDocument();
    expect(within(column("Pending")).queryByRole("article")).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("ignores an event older than what the board already shows", async () => {
    await renderBoard([
      order({ id: 1, order_number: "1001", status: "IN_ROUTE", updated_at: "2026-09-30T12:10:00Z" }),
    ]);

    receive({ type: "order.status_changed", orderId: "1", status: "ACCEPTED", updatedAt: "2026-09-30T12:05:00Z" });

    expect(within(column("In route")).getByRole("article", { name: "Order 1001" })).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("refetches when an event is about an order the board does not have", async () => {
    await renderBoard([order({ id: 1, order_number: "1001" })]);

    receive({ type: "order.status_changed", orderId: "99", status: "ACCEPTED" });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("refetches when an event is of a kind this version does not know", async () => {
    await renderBoard([order({ id: 1, order_number: "1001" })]);

    receive({ type: "order.refunded", orderId: "1", status: "PENDING" });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(within(column("Pending")).getByRole("article", { name: "Order 1001" })).toBeInTheDocument();
  });

  it("ignores events for another store", async () => {
    await renderBoard([order({ id: 1, order_number: "1001" })]);

    receive({ type: "order.status_changed", orderId: "1", storeId: "8", status: "ACCEPTED" });

    expect(within(column("Pending")).getByRole("article", { name: "Order 1001" })).toBeInTheDocument();
  });

  it("shows this tab's own move once, whether its echo arrives before or after the API answers", async () => {
    await renderBoard([order({ id: 1, order_number: "1001" })]);
    let answer!: (order: Order) => void;
    mockUpdate.mockReturnValue(new Promise<Order>((resolve) => (answer = resolve)));

    drag(card("1001"), column("Accepted"));
    // The echo beats the API's answer.
    receive({ type: "order.status_changed", orderId: "1", status: "ACCEPTED" });
    expect(within(column("Accepted")).getAllByRole("article")).toHaveLength(1);
    expect(within(column("Pending")).queryByRole("article")).not.toBeInTheDocument();

    await act(async () =>
      answer(order({ id: 1, order_number: "1001", status: "ACCEPTED", updated_at: "2026-09-30T12:05:00Z" })),
    );
    // …and is repeated after it.
    receive({ type: "order.status_changed", orderId: "1", status: "ACCEPTED" });

    expect(within(column("Accepted")).getAllByRole("article")).toHaveLength(1);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("shows a change made elsewhere after this tab's own move", async () => {
    await renderBoard([order({ id: 1, order_number: "1001" })]);
    drag(card("1001"), column("Accepted"));
    await waitFor(() => expect(card("1001")).toHaveAttribute("aria-busy", "false"));

    receive({ type: "order.status_changed", orderId: "1", status: "IN_ROUTE", updatedAt: "2026-09-30T12:09:00Z" });

    expect(within(column("In route")).getByRole("article", { name: "Order 1001" })).toBeInTheDocument();
  });

  it("keeps a live change when a fetch that started earlier comes back older", async () => {
    await renderBoard([order({ id: 1, order_number: "1001" })]);
    let finish!: (orders: Order[]) => void;
    mockList.mockReturnValue(new Promise<Order[]>((resolve) => (finish = resolve)));
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    receive({ type: "order.status_changed", orderId: "1", status: "ACCEPTED" });
    await act(async () => finish([order({ id: 1, order_number: "1001" })]));

    expect(within(column("Accepted")).getByRole("article", { name: "Order 1001" })).toBeInTheDocument();
  });

  it("closes the connection when the board goes away", async () => {
    mockList.mockResolvedValue([order()]);
    const { unmount } = renderWithProviders(<OrdersBoard />);
    await screen.findByRole("article", { name: "Order 1001" });
    const { close } = broker.opened[broker.opened.length - 1];

    unmount();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("opens no connection until a store is selected", () => {
    selectedStoreId = null;

    renderWithProviders(<OrdersBoard />);

    expect(broker.opened).toHaveLength(0);
  });
});
