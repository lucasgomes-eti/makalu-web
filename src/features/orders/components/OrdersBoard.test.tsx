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
import { listStoreOrders } from "../api/ordersApi";
import OrdersBoard from "./OrdersBoard";

vi.mock("../api/ordersApi", () => ({ listStoreOrders: vi.fn() }));

let selectedStoreId: number | null = 7;
vi.mock("@/features/stores/context/SelectedStoreProvider", () => ({
  useSelectedStore: () => ({ selectedStoreId }),
}));

const mockList = vi.mocked(listStoreOrders);

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

  it("moves a pending order to accepted when dropped there", async () => {
    mockList.mockResolvedValue([order()]);

    renderWithProviders(<OrdersBoard />);
    const card = await screen.findByRole("article", { name: "Order 1001" });
    drag(card, column("Accepted"));

    expect(
      within(column("Accepted")).getByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
    expect(within(column("Pending")).queryByRole("article")).not.toBeInTheDocument();
  });

  it("refuses a move the order lifecycle does not allow", async () => {
    mockList.mockResolvedValue([order()]);

    renderWithProviders(<OrdersBoard />);
    const card = await screen.findByRole("article", { name: "Order 1001" });
    drag(card, column("In route"));

    expect(
      within(column("Pending")).getByRole("article", { name: "Order 1001" }),
    ).toBeInTheDocument();
    expect(within(column("In route")).queryByRole("article")).not.toBeInTheDocument();
  });

  it("does not let a finished order be picked up", async () => {
    mockList.mockResolvedValue([order({ status: "FINISHED" })]);

    renderWithProviders(<OrdersBoard />);

    expect(await screen.findByRole("article", { name: "Order 1001" })).toHaveAttribute(
      "draggable",
      "false",
    );
  });

  it("discards local moves when the orders are refreshed", async () => {
    mockList.mockResolvedValue([order()]);
    const user = userEvent.setup();

    renderWithProviders(<OrdersBoard />);
    drag(await screen.findByRole("article", { name: "Order 1001" }), column("Accepted"));
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() =>
      expect(
        within(column("Pending")).getByRole("article", { name: "Order 1001" }),
      ).toBeInTheDocument(),
    );
  });
});
