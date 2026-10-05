import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test/renderWithProviders";
import { order, orderItem } from "@/test/orders";
import { AxiosError, AxiosHeaders } from "axios";
import { listStoreOrders, updateOrderStatus } from "../api/ordersApi";
import { Order, OrderStatus } from "../model/order.types";
import OrdersBoard from "./OrdersBoard";

vi.mock("../api/ordersApi", () => ({
  listStoreOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

let selectedStoreId: number | null = 7;
vi.mock("@/features/stores/context/SelectedStoreProvider", () => ({
  useSelectedStore: () => ({ selectedStoreId }),
}));

const mockList = vi.mocked(listStoreOrders);
const mockUpdate = vi.mocked(updateOrderStatus);

/** The API echoes the order back with its new status. */
function acceptMoves() {
  mockUpdate.mockImplementation(async (id: number, status: OrderStatus) =>
    order({ id, status }),
  );
}

function apiError(status: number, internal_code: string, message: string) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, null, {
    status,
    data: { http_code: status, internal_code, message },
    statusText: "",
    headers: {},
    config,
  });
}

function column(name: string) {
  return screen.getByRole("region", { name });
}

/** jsdom has no DataTransfer; the board only needs these members. */
function dataTransfer() {
  return { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
}

function drag(card: HTMLElement, target: HTMLElement) {
  const transfer = dataTransfer();
  fireEvent.dragStart(card, { dataTransfer: transfer });
  fireEvent.dragOver(target, { dataTransfer: transfer });
  fireEvent.drop(target, { dataTransfer: transfer });
  fireEvent.dragEnd(card, { dataTransfer: transfer });
}

describe("OrdersBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedStoreId = 7;
    acceptMoves();
  });

  it("places each order in the column for its status", async () => {
    mockList.mockResolvedValue([
      order({ id: 1, order_number: "1001" }),
      order({ id: 2, order_number: "1002", status: "ACCEPTED" }),
      order({ id: 3, order_number: "1003", status: "IN_ROUTE" }),
    ]);

    renderWithProviders(<OrdersBoard />);

    await screen.findByRole("article", { name: "Order 1001" });
    expect(mockList).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    expect(
      within(column("Pending")).getByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
    expect(
      within(column("Accepted")).getByRole("article", { name: "Order 1002" }),
    ).toBeInTheDocument();
    expect(
      within(column("In route")).getByRole("article", { name: "Order 1003" }),
    ).toBeInTheDocument();
    expect(column("Finished")).toBeInTheDocument();
    expect(column("Cancelled")).toBeInTheDocument();
  });

  it("shows what was ordered, where it goes, and the total", async () => {
    mockList.mockResolvedValue([
      order({
        items: [
          orderItem({
            notes: "No onions",
            configurations: [
              {
                id: 1,
                name: "Size",
                options: [{ id: 1, name: "Large", additional_price: 3, quantity: 1 }],
              },
              {
                id: 2,
                name: "Extras",
                options: [{ id: 2, name: "Bacon", additional_price: 2, quantity: 2 }],
              },
            ],
          }),
        ],
      }),
    ]);

    renderWithProviders(<OrdersBoard />);
    const card = await screen.findByRole("article", { name: "Order 1001" });

    expect(within(card).getByText("Cheeseburger")).toBeInTheDocument();
    expect(card).toHaveTextContent("Size: Large");
    expect(card).toHaveTextContent("Extras: Bacon (2x)");
    expect(within(card).getByText("“No onions”")).toBeInTheDocument();
    expect(within(card).getByText("12 Main St")).toBeInTheDocument();
    expect(within(card).getByText("Delivery $5.00")).toBeInTheDocument();
    expect(within(card).getByText("$29.90")).toBeInTheDocument();
  });

  it("asks the user to pick a store before fetching anything", () => {
    selectedStoreId = null;

    renderWithProviders(<OrdersBoard />);

    expect(screen.getByText("Select a store to see its orders.")).toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("says so when the store has no orders yet", async () => {
    mockList.mockResolvedValue([]);

    renderWithProviders(<OrdersBoard />);

    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    mockList.mockRejectedValueOnce(new Error("down")).mockResolvedValue([order()]);
    const user = userEvent.setup();

    renderWithProviders(<OrdersBoard />);
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("article", { name: "Order 1001" })).toBeInTheDocument();
  });

  it("fetches the orders again on refresh, keeping the board on screen meanwhile", async () => {
    let resolveRefresh: (orders: ReturnType<typeof order>[]) => void = () => {};
    mockList
      .mockResolvedValueOnce([order()])
      .mockImplementationOnce(() => new Promise((resolve) => (resolveRefresh = resolve)));
    const user = userEvent.setup();

    renderWithProviders(<OrdersBoard />);
    await screen.findByRole("article", { name: "Order 1001" });
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(mockList).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("article", { name: "Order 1001" })).toBeInTheDocument();

    resolveRefresh([order(), order({ id: 2, order_number: "1002" })]);

    expect(await screen.findByRole("article", { name: "Order 1002" })).toBeInTheDocument();
  });

  it("saves a move to the API when an order is dropped on another column", async () => {
    mockList.mockResolvedValue([order()]);

    renderWithProviders(<OrdersBoard />);
    const card = await screen.findByRole("article", { name: "Order 1001" });
    drag(card, column("Accepted"));

    expect(mockUpdate).toHaveBeenCalledWith(1, "ACCEPTED");
    await waitFor(() =>
      expect(
        within(column("Accepted")).getByRole("article", { name: "Order 1001" }),
      ).not.toHaveAttribute("aria-busy", "true"),
    );
    expect(within(column("Pending")).queryByRole("article")).not.toBeInTheDocument();
  });

  it("moves the card at once, before the API answers", async () => {
    let resolveUpdate: (updated: Order) => void = () => {};
    mockUpdate.mockImplementation(
      () => new Promise((resolve) => (resolveUpdate = resolve)),
    );
    mockList.mockResolvedValue([order()]);

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Accepted"));

    const moved = within(column("Accepted")).getByRole("article", { name: "Order 1001" });
    expect(moved).toHaveAttribute("aria-busy", "true");
    expect(moved).toHaveAttribute("draggable", "false");

    resolveUpdate(order({ status: "ACCEPTED" }));

    await waitFor(() => expect(moved).toHaveAttribute("aria-busy", "false"));
    expect(moved).toHaveAttribute("draggable", "true");
  });

  it("moves the card back and says why when the API rejects the move", async () => {
    mockUpdate.mockRejectedValue(
      apiError(400, "MK-706", "Order cannot move from PENDING to ACCEPTED"),
    );
    mockList.mockResolvedValue([order()]);

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Accepted"));

    expect(
      await screen.findByText("(MK-706) Order cannot move from PENDING to ACCEPTED"),
    ).toBeInTheDocument();
    expect(
      within(column("Pending")).getByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
    expect(within(column("Accepted")).queryByRole("article")).not.toBeInTheDocument();
  });

  it("reloads the board when the order changed elsewhere or no longer exists", async () => {
    mockUpdate.mockRejectedValue(apiError(404, "MK-705", "Order not found"));
    mockList.mockResolvedValue([order()]);

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Accepted"));

    await screen.findByText("(MK-705) Order not found");
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("lets the user dismiss a rejected move's error", async () => {
    mockUpdate.mockRejectedValue(apiError(500, "MK-500", "Something broke"));
    mockList.mockResolvedValue([order()]);
    const user = userEvent.setup();

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Accepted"));
    await screen.findByText("(MK-500) Something broke");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("(MK-500) Something broke")).not.toBeInTheDocument();
  });

  it("asks before cancelling, and sends nothing if the user keeps the order", async () => {
    mockList.mockResolvedValue([order()]);
    const user = userEvent.setup();

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Cancelled"));

    const dialog = screen.getByRole("dialog", { name: "Cancel order?" });
    expect(dialog).toHaveTextContent("Order #1001 will be cancelled.");
    await user.click(within(dialog).getByRole("button", { name: "Keep order" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(
      within(column("Pending")).getByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
  });

  it("cancels the order once the user confirms", async () => {
    mockList.mockResolvedValue([order({ status: "ACCEPTED" })]);
    const user = userEvent.setup();

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Cancelled"));
    await user.click(screen.getByRole("button", { name: "Cancel order" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(mockUpdate).toHaveBeenCalledWith(1, "CANCELLED");
    expect(
      await within(column("Cancelled")).findByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
  });

  it("refuses a move the order lifecycle does not allow", async () => {
    mockList.mockResolvedValue([order()]);

    renderWithProviders(<OrdersBoard />);
    const card = await screen.findByRole("article", { name: "Order 1001" });
    drag(card, column("In route"));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(
      within(column("Pending")).getByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
    expect(within(column("In route")).queryByRole("article")).not.toBeInTheDocument();
  });

  it("leaves finishing an order to the customer", async () => {
    mockList.mockResolvedValue([order({ status: "IN_ROUTE" })]);

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Finished"));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(
      within(column("In route")).getByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
  });

  it("does not let a finished order be picked up", async () => {
    mockList.mockResolvedValue([order({ status: "FINISHED" })]);

    renderWithProviders(<OrdersBoard />);

    expect(await screen.findByRole("article", { name: "Order 1001" })).toHaveAttribute(
      "draggable",
      "false",
    );
  });

  it("shows the server's statuses after a refresh", async () => {
    mockList
      .mockResolvedValueOnce([order()])
      .mockResolvedValueOnce([order({ status: "IN_ROUTE" })]);
    const user = userEvent.setup();

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Accepted"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(
      await within(column("In route")).findByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
  });
});
