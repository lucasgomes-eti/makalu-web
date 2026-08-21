import { describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  screen,
  userEvent,
} from "@/test/renderWithProviders";
import { StoreSummary } from "../model/store.types";
import StoreSwitcher from "./StoreSwitcher";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { context } = vi.hoisted(() => ({
  context: {
    value: {
      stores: [] as StoreSummary[],
      selectedStoreId: null as number | null,
      selectStore: vi.fn(),
      isLoading: false,
    },
  },
}));
vi.mock("../context/SelectedStoreProvider", () => ({
  useSelectedStore: () => context.value,
}));

const stores: StoreSummary[] = [
  { id: 1, name: "Burgers", logo_image_id: 5 },
  { id: 2, name: "Pizza", logo_image_id: null },
];

function setContext(overrides: Partial<typeof context.value> = {}) {
  context.value = {
    stores,
    selectedStoreId: 1,
    selectStore: vi.fn(),
    isLoading: false,
    ...overrides,
  };
  return context.value;
}

describe("StoreSwitcher", () => {
  it("shows the selected store under an accessible name", () => {
    setContext();

    renderWithProviders(<StoreSwitcher />);

    const select = screen.getByRole("combobox", { name: "Select store" });
    expect(select).toHaveTextContent("Burgers");
  });

  it("switches the dashboard to another store", async () => {
    const value = setContext();
    const user = userEvent.setup();

    renderWithProviders(<StoreSwitcher />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /Pizza/ }));

    expect(value.selectStore).toHaveBeenCalledWith(2);
  });

  it("opens the edit screen without also switching store", async () => {
    const value = setContext();
    const user = userEvent.setup();

    renderWithProviders(<StoreSwitcher />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("button", { name: "Edit Pizza" }));

    expect(push).toHaveBeenCalledWith("/dashboard/stores/2");
    expect(value.selectStore).not.toHaveBeenCalled();
  });

  it("links to store creation", async () => {
    setContext();
    const user = userEvent.setup();

    renderWithProviders(<StoreSwitcher />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Add store" }));

    expect(push).toHaveBeenCalledWith("/dashboard/stores/new");
  });

  it("says it is loading, and stays disabled, until the stores arrive", () => {
    setContext({ stores: [], selectedStoreId: null, isLoading: true });

    renderWithProviders(<StoreSwitcher />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Loading stores...");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
  });
});
