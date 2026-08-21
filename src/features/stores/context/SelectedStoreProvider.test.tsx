import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
} from "@/test/renderWithProviders";
import { listOwnedStores } from "../api/storesApi";
import { selectedStorePreference } from "../model/selectedStorePreference";
import { SelectedStoreProvider, useSelectedStore } from "./SelectedStoreProvider";

vi.mock("../api/storesApi", () => ({ listOwnedStores: vi.fn() }));

const mockList = vi.mocked(listOwnedStores);

const stores = [
  { id: 1, name: "Burgers", logo_image_id: null },
  { id: 2, name: "Pizza", logo_image_id: null },
];

function Probe() {
  const { selectedStoreId, selectedStore, selectStore, stores: all } =
    useSelectedStore();

  return (
    <div>
      <span data-testid="selected">{selectedStoreId ?? "none"}</span>
      <span data-testid="selected-name">{selectedStore?.name ?? "none"}</span>
      <span data-testid="count">{all.length}</span>
      <button onClick={() => selectStore(2)}>Select Pizza</button>
    </div>
  );
}

function renderProvider() {
  return renderWithProviders(
    <SelectedStoreProvider>
      <Probe />
    </SelectedStoreProvider>,
  );
}

describe("SelectedStoreProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("defaults to the first owned store", async () => {
    mockList.mockResolvedValue(stores);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("selected")).toHaveTextContent("1"));
    expect(screen.getByTestId("selected-name")).toHaveTextContent("Burgers");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("restores the store the user last worked on", async () => {
    selectedStorePreference.write(2);
    mockList.mockResolvedValue(stores);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("selected")).toHaveTextContent("2"));
  });

  it("ignores a remembered store the user no longer owns", async () => {
    selectedStorePreference.write(99);
    mockList.mockResolvedValue(stores);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("selected")).toHaveTextContent("1"));
  });

  it("selects nothing when the user owns no stores", async () => {
    mockList.mockResolvedValue([]);

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("selected")).toHaveTextContent("none"),
    );
  });

  it("remembers a new selection for the next visit", async () => {
    mockList.mockResolvedValue(stores);
    const user = userEvent.setup();

    renderProvider();
    await waitFor(() => expect(screen.getByTestId("selected")).toHaveTextContent("1"));

    await user.click(screen.getByRole("button", { name: "Select Pizza" }));

    expect(screen.getByTestId("selected")).toHaveTextContent("2");
    expect(selectedStorePreference.read()).toBe(2);
  });

  it("fails loudly when consumed outside the provider", () => {
    // React logs the thrown error; silence it so the run stays readable.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderWithProviders(<Probe />)).toThrow(
      /must be used within a SelectedStoreProvider/,
    );

    consoleError.mockRestore();
  });
});
