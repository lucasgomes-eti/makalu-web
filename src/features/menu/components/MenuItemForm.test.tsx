import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test/renderWithProviders";
import { MenuItem } from "../model/menuItem.types";
import { saveMenuItem } from "../api/menuApi";
import MenuItemForm from "./MenuItemForm";

const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, back }) }));
vi.mock("../api/menuApi", () => ({ saveMenuItem: vi.fn() }));
vi.mock("@/features/stores/context/SelectedStoreProvider", () => ({
  useSelectedStore: () => ({ selectedStoreId: 7 }),
}));

const mockSave = vi.mocked(saveMenuItem);

const existingItem: MenuItem = {
  id: 12,
  store_id: 7,
  name: "Cheeseburger",
  category: "Burgers",
  price: 24.9,
  ingredients: "Beef, cheese",
  configurations: [
    {
      name: "Size",
      type: "SINGLE_CHOICE",
      options: [
        { name: "Regular", additional_price: 0 },
        { name: "Large", additional_price: 3 },
      ],
    },
  ],
  image_id: null,
};

async function fillRequiredFields() {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Fries");
  await user.type(screen.getByRole("textbox", { name: /^Category/ }), "Sides");
  await user.type(screen.getByLabelText(/price/i), "9.50");
  return user;
}

describe("MenuItemForm — creating", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts blank and titled for creation", () => {
    renderWithProviders(<MenuItemForm />);

    expect(
      screen.getByRole("heading", { name: "New menu item" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("saves the item and returns to the menu", async () => {
    mockSave.mockResolvedValue(99);

    renderWithProviders(<MenuItemForm />);
    const user = await fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        7,
        // The number input normalises the trailing zero away; `parseAmount`
        // turns either form into 9.5.
        expect.objectContaining({ name: "Fries", category: "Sides", price: "9.5" }),
        undefined,
      ),
    );
    expect(push).toHaveBeenCalledWith("/dashboard/menu");
  });

  it("refuses to save without a name, category and price", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Category is required.")).toBeInTheDocument();
    expect(screen.getByText("Price must be greater than 0.")).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("clears a field's error as soon as the user corrects it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm />);

    await user.click(screen.getByRole("button", { name: "Create" }));
    await screen.findByText("Name is required.");

    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "F");

    expect(screen.queryByText("Name is required.")).not.toBeInTheDocument();
  });

  it("surfaces a save failure without navigating away", async () => {
    mockSave.mockRejectedValue(new Error("conflict"));

    renderWithProviders(<MenuItemForm />);
    const user = await fillRequiredFields();
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(
      await screen.findByText("Could not create the menu item."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("MenuItemForm — editing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pre-fills every field from the loaded item", () => {
    renderWithProviders(<MenuItemForm menuItem={existingItem} />);

    expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveValue("Cheeseburger");
    expect(screen.getByLabelText(/price/i)).toHaveValue(24.9);
    expect(screen.getByDisplayValue("Size")).toBeInTheDocument();
    expect(screen.getByText("Large (+$3.00)")).toBeInTheDocument();
  });

  it("shows an option without a surcharge as a bare name", () => {
    renderWithProviders(<MenuItemForm menuItem={existingItem} />);

    expect(screen.getByText("Regular")).toBeInTheDocument();
  });

  it("updates in place rather than creating a duplicate", async () => {
    mockSave.mockResolvedValue(12);
    const user = userEvent.setup();

    renderWithProviders(<MenuItemForm menuItem={existingItem} />);
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(7, expect.anything(), 12),
    );
  });

  it("abandons the edit on cancel", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm menuItem={existingItem} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(back).toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe("MenuItemForm — configurations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds a configuration group", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm />);

    await user.click(screen.getByRole("button", { name: "Add configuration" }));

    expect(
      screen.getByRole("textbox", { name: "Configuration name" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent(
      "Single choice",
    );
  });

  it("adds an option with a surcharge to a configuration", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm />);

    await user.click(screen.getByRole("button", { name: "Add configuration" }));
    await user.click(screen.getByRole("button", { name: "Add option" }));
    await user.type(screen.getByRole("textbox", { name: "Option name" }), "Bacon");
    await user.type(screen.getByLabelText("Additional price"), "2.50");
    await user.click(screen.getByRole("button", { name: /^Add$/ }));

    expect(screen.getByText("Bacon (+$2.50)")).toBeInTheDocument();
  });

  it("ignores an attempt to add a nameless option", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm />);

    await user.click(screen.getByRole("button", { name: "Add configuration" }));
    await user.click(screen.getByRole("button", { name: "Add option" }));
    await user.click(screen.getByRole("button", { name: /^Add$/ }));

    // The draft editor stays open instead of adding an unnamed chip.
    expect(screen.getByRole("textbox", { name: "Option name" })).toBeInTheDocument();
  });

  it("removes an option without disturbing its neighbours", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm menuItem={existingItem} />);

    const regularChip = screen.getByText("Regular").closest(".MuiChip-root");
    await user.click(
      within(regularChip as HTMLElement).getByTestId("CancelIcon"),
    );

    expect(screen.queryByText("Regular")).not.toBeInTheDocument();
    expect(screen.getByText("Large (+$3.00)")).toBeInTheDocument();
  });

  it("removes the right configuration when several exist", async () => {
    // Regression: rows were keyed by array index, so deleting one shifted the
    // inputs of every row below it onto the wrong configuration.
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm />);

    await user.click(screen.getByRole("button", { name: "Add configuration" }));
    await user.click(screen.getByRole("button", { name: "Add configuration" }));

    const [firstName, secondName] = screen.getAllByRole("textbox", {
      name: "Configuration name",
    });
    await user.type(firstName, "Size");
    await user.type(secondName, "Extras");

    const [removeFirst] = screen.getAllByRole("button", {
      name: "Remove configuration",
    });
    await user.click(removeFirst);

    const remaining = screen.getAllByRole("textbox", {
      name: "Configuration name",
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveValue("Extras");
  });

  it("changes a configuration's type", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MenuItemForm />);

    await user.click(screen.getByRole("button", { name: "Add configuration" }));
    await user.click(screen.getByRole("combobox", { name: "Type" }));
    await user.click(screen.getByRole("option", { name: "Quantity" }));

    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent(
      "Quantity",
    );
  });
});
