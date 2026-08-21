import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/renderWithProviders";
import ImagePicker from "./ImagePicker";

const file = () => new File(["binary"], "logo.png", { type: "image/png" });

describe("ImagePicker", () => {
  it("shows the stored image when one exists", () => {
    renderWithProviders(
      <ImagePicker
        variant="cover"
        label="Cover image"
        imageId={42}
        onFileSelected={vi.fn()}
      />,
    );

    expect(screen.getByAltText("Cover image")).toHaveAttribute(
      "src",
      "http://api.test/images/42",
    );
  });

  it("prompts for an upload when there is no image", () => {
    renderWithProviders(
      <ImagePicker
        variant="cover"
        label="Click to upload a cover image"
        onFileSelected={vi.fn()}
      />,
    );

    expect(screen.getByText("Click to upload a cover image")).toBeInTheDocument();
  });

  it("hands the chosen file to its parent and previews it", async () => {
    const onFileSelected = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ImagePicker
        variant="cover"
        label="Cover image"
        onFileSelected={onFileSelected}
        clearable
      />,
    );

    await user.upload(screen.getByLabelText("Cover image"), file());

    expect(onFileSelected).toHaveBeenCalledWith(expect.any(File));
    await waitFor(() =>
      expect(screen.getByAltText("Cover image")).toHaveAttribute(
        "src",
        expect.stringContaining("data:image/png;base64"),
      ),
    );
    expect(screen.getByText("Selected: logo.png")).toBeInTheDocument();
  });

  it("reverts to the stored image when the selection is cleared", async () => {
    const onFileSelected = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ImagePicker
        variant="cover"
        label="Cover image"
        imageId={42}
        onFileSelected={onFileSelected}
        clearable
      />,
    );

    await user.upload(screen.getByLabelText("Cover image"), file());
    await screen.findByText("Selected: logo.png");

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onFileSelected).toHaveBeenLastCalledWith(null);
    expect(screen.getByAltText("Cover image")).toHaveAttribute(
      "src",
      "http://api.test/images/42",
    );
  });

  it("offers no Clear button unless asked for one", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ImagePicker variant="cover" label="Cover image" onFileSelected={vi.fn()} />,
    );

    await user.upload(screen.getByLabelText("Cover image"), file());

    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("renders the avatar variant as a labelled circular control", () => {
    renderWithProviders(
      <ImagePicker
        variant="avatar"
        label="Store logo"
        imageId={7}
        onFileSelected={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Store logo")).toBeInTheDocument();
    expect(screen.getByAltText("Store logo")).toHaveAttribute(
      "src",
      "http://api.test/images/7",
    );
  });
});
