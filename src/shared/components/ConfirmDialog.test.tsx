import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/renderWithProviders";
import ConfirmDialog from "./ConfirmDialog";

const baseProps = {
  open: true,
  title: "Delete menu item?",
  description: "This cannot be undone.",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ConfirmDialog", () => {
  it("shows nothing until it is opened", () => {
    renderWithProviders(<ConfirmDialog {...baseProps} open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("announces its title and description to assistive technology", () => {
    renderWithProviders(<ConfirmDialog {...baseProps} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Delete menu item?");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("reports confirmation and cancellation separately", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog
        {...baseProps}
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("locks both buttons while the action is running", () => {
    renderWithProviders(
      <ConfirmDialog
        {...baseProps}
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        isPending
      />,
    );

    expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
