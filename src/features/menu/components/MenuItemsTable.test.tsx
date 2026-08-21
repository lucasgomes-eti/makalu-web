import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
} from "@/test/renderWithProviders";
import { MenuItem } from "../model/menuItem.types";
import { deleteMenuItem, listMenuItems } from "../api/menuApi";
import MenuItemsTable from "./MenuItemsTable";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../api/menuApi", () => ({
  listMenuItems: vi.fn(),
  deleteMenuItem: vi.fn(),
}));

let selectedStoreId: number | null = 7;
vi.mock("@/features/stores/context/SelectedStoreProvider", () => ({
  useSelectedStore: () => ({ selectedStoreId }),
}));

const mockList = vi.mocked(listMenuItems);
const mockDelete = vi.mocked(deleteMenuItem);

function menuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 1,
    store_id: 7,
    name: "Cheeseburger",
    category: "Burgers",
    price: 24.9,
    ingredients: "Beef, cheese",
    configurations: [],
    image_id: null,
    ...overrides,
  };
}

describe("MenuItemsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedStoreId = 7;
  });

  it("lists the selected store's items with formatted prices", async () => {
    mockList.mockResolvedValue([
      menuItem(),
      menuItem({ id: 2, name: "Fries", category: "Sides", price: 9.5 }),
    ]);

    renderWithProviders(<MenuItemsTable />);

    expect(await screen.findByText("Cheeseburger")).toBeInTheDocument();
    expect(screen.getByText("$24.90")).toBeInTheDocument();
    expect(screen.getByText("$9.50")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  });

  it("asks the user to pick a store before fetching anything", () => {
    selectedStoreId = null;

    renderWithProviders(<MenuItemsTable />);

    expect(screen.getByText("Select a store to see its menu.")).toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("says so when the store has no items yet", async () => {
    mockList.mockResolvedValue([]);

    renderWithProviders(<MenuItemsTable />);

    expect(await screen.findByText("No menu items yet.")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    mockList.mockRejectedValueOnce(new Error("down")).mockResolvedValue([menuItem()]);
    const user = userEvent.setup();

    renderWithProviders(<MenuItemsTable />);

    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Cheeseburger")).toBeInTheDocument();
  });

  it("navigates to the edit screen for a row", async () => {
    mockList.mockResolvedValue([menuItem({ id: 12 })]);
    const user = userEvent.setup();

    renderWithProviders(<MenuItemsTable />);
    await user.click(await screen.findByRole("button", { name: "Edit Cheeseburger" }));

    expect(push).toHaveBeenCalledWith("/dashboard/menu/12");
  });

  it("confirms before deleting, and refreshes the list afterwards", async () => {
    mockList
      .mockResolvedValueOnce([menuItem({ id: 12 })])
      .mockResolvedValueOnce([]);
    mockDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<MenuItemsTable />);
    await user.click(
      await screen.findByRole("button", { name: "Delete Cheeseburger" }),
    );

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Delete menu item?");
    expect(mockDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(7, 12));
    expect(await screen.findByText("No menu items yet.")).toBeInTheDocument();
  });

  it("does not delete anything when the user backs out", async () => {
    mockList.mockResolvedValue([menuItem()]);
    const user = userEvent.setup();

    renderWithProviders(<MenuItemsTable />);
    await user.click(
      await screen.findByRole("button", { name: "Delete Cheeseburger" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("reports a failed delete inside the dialog, without hiding the table", async () => {
    mockList.mockResolvedValue([menuItem()]);
    mockDelete.mockRejectedValue(new Error("locked"));
    const user = userEvent.setup();

    renderWithProviders(<MenuItemsTable />);
    await user.click(
      await screen.findByRole("button", { name: "Delete Cheeseburger" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByText("Could not delete this menu item."),
    ).toBeInTheDocument();
    // The table the user was looking at is still mounted behind the dialog.
    // (An open MUI modal marks the rest of the page `aria-hidden`, hence
    // `hidden: true` — without it the accessibility tree hides the table.)
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Menu items", hidden: true }),
    ).toBeInTheDocument();
  });
});
