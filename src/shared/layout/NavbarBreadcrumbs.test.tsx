import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/renderWithProviders";
import NavbarBreadcrumbs from "./NavbarBreadcrumbs";

const { pathname } = vi.hoisted(() => ({ pathname: { value: "/dashboard/menu" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("NavbarBreadcrumbs", () => {
  it("derives the trail from the path, capitalised", () => {
    pathname.value = "/dashboard/menu";

    renderWithProviders(<NavbarBreadcrumbs />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Menu")).toBeInTheDocument();
  });

  it("marks a numeric id as an identifier rather than a word", () => {
    pathname.value = "/dashboard/menu/12";

    renderWithProviders(<NavbarBreadcrumbs />);

    expect(screen.getByText("#12")).toBeInTheDocument();
  });

  it("renders nothing at the root", () => {
    pathname.value = "/";

    const { container } = renderWithProviders(<NavbarBreadcrumbs />);

    expect(container.querySelectorAll("li")).toHaveLength(0);
  });
});
