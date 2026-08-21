import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
} from "@/test/renderWithProviders";
import { Store } from "../model/store.types";
import { listCategories, saveStore } from "../api/storesApi";
import StoreForm from "./StoreForm";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));

vi.mock("../api/storesApi", () => ({
  saveStore: vi.fn(),
  listCategories: vi.fn(),
}));

const refreshStores = vi.fn();
const selectStore = vi.fn();
vi.mock("../context/SelectedStoreProvider", () => ({
  useSelectedStore: () => ({ refreshStores, selectStore }),
}));

// The map needs the Google Maps SDK; the form's own behaviour is what is under
// test, so the picker is replaced by a button that reports a fixed location.
vi.mock("./LocationPicker", () => ({
  default: ({
    onLocationChange,
    error,
  }: {
    onLocationChange: (lat: number, lng: number) => void;
    error?: string;
  }) => (
    <div>
      <button type="button" onClick={() => onLocationChange(-15.79, -47.88)}>
        Pick location
      </button>
      {error && <span>{error}</span>}
    </div>
  ),
}));

const mockSave = vi.mocked(saveStore);
const mockCategories = vi.mocked(listCategories);

const existingStore: Store = {
  id: 5,
  name: "Makalu Burgers",
  categories: [{ id: 1, description: "Burgers" }],
  latitude: -15.79,
  longitude: -47.88,
  delivery_fee: 4.5,
  logo_image_id: null,
  cover_image_id: null,
};

function axiosValidationError() {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR", config, null, {
    status: 422,
    data: {
      http_code: 422,
      message: "Validation failed",
      internal_code: "VALIDATION",
      field_errors: [{ field: "name", message: "That name is already taken" }],
    },
    statusText: "",
    headers: {},
    config,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe("StoreForm — creating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories.mockResolvedValue([
      { id: 1, description: "Burgers" },
      { id: 2, description: "Pizza" },
    ]);
  });

  it("refuses to save an empty form and lists every problem", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StoreForm />);

    await user.click(screen.getByRole("button", { name: "Create store" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Select at least one category.")).toBeInTheDocument();
    expect(screen.getByText("Pick the store location on the map.")).toBeInTheDocument();
    expect(
      screen.getByText("Delivery fee must be greater than 0."),
    ).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("creates the store, refreshes the switcher and selects it", async () => {
    mockSave.mockResolvedValue(77);
    const user = userEvent.setup();
    renderWithProviders(<StoreForm />);

    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "New Store");
    await user.type(screen.getByLabelText(/delivery fee/i), "5");
    await user.click(screen.getByRole("button", { name: "Pick location" }));
    await user.click(await screen.findByRole("combobox", { name: /categories/i }));
    await user.click(await screen.findByRole("option", { name: "Pizza" }));
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Create store" }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Store",
          categoryIds: [2],
          latitude: -15.79,
          longitude: -47.88,
          deliveryFee: "5",
        }),
        undefined,
      ),
    );
    expect(refreshStores).toHaveBeenCalled();
    expect(selectStore).toHaveBeenCalledWith(77);
    expect(back).toHaveBeenCalled();
  });

  it("accepts a store located at the equator", async () => {
    // A falsy check on latitude would reject 0.
    mockSave.mockResolvedValue(1);
    const user = userEvent.setup();
    renderWithProviders(<StoreForm />);

    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Equator");
    await user.type(screen.getByLabelText(/delivery fee/i), "5");
    await user.click(screen.getByRole("button", { name: "Pick location" }));
    await user.click(await screen.findByRole("combobox", { name: /categories/i }));
    await user.click(await screen.findByRole("option", { name: "Burgers" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Create store" }));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(screen.queryByText("Pick the store location on the map.")).toBeNull();
  });
});

describe("StoreForm — editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories.mockResolvedValue([{ id: 1, description: "Burgers" }]);
  });

  it("pre-fills the form from the loaded store", async () => {
    renderWithProviders(<StoreForm store={existingStore} />);

    expect(
      screen.getByRole("heading", { name: "Edit Makalu Burgers" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveValue(
      "Makalu Burgers",
    );
    expect(screen.getByLabelText(/delivery fee/i)).toHaveValue(4.5);
    expect(await screen.findByText("Burgers")).toBeInTheDocument();
  });

  it("updates the existing store rather than creating another", async () => {
    mockSave.mockResolvedValue(5);
    const user = userEvent.setup();
    renderWithProviders(<StoreForm store={existingStore} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(expect.anything(), 5),
    );
  });

  it("puts the server's validation message on the offending field", async () => {
    mockSave.mockRejectedValue(axiosValidationError());
    const user = userEvent.setup();
    renderWithProviders(<StoreForm store={existingStore} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("That name is already taken"),
    ).toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
  });

  it("does not navigate away when saving fails", async () => {
    mockSave.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderWithProviders(<StoreForm store={existingStore} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Could not update the store."),
    ).toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
    expect(refreshStores).not.toHaveBeenCalled();
  });

  it("leaves without saving on Back", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StoreForm store={existingStore} />);

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(back).toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
