import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/renderWithProviders";
import { tokenStorage } from "@/lib/auth/tokenStorage";
import AuthGuard from "./AuthGuard";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders the protected content for a signed-in user", async () => {
    tokenStorage.save(
      { access_token: "a", refresh_token: "r" },
      { remember: true },
    );

    renderWithProviders(
      <AuthGuard>
        <p>Orders</p>
      </AuthGuard>,
    );

    expect(await screen.findByText("Orders")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to sign-in when there is no session", async () => {
    renderWithProviders(
      <AuthGuard>
        <p>Orders</p>
      </AuthGuard>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
    expect(screen.queryByText("Orders")).not.toBeInTheDocument();
  });

  it("never leaks protected content while the session is being resolved", () => {
    renderWithProviders(
      <AuthGuard>
        <p>Orders</p>
      </AuthGuard>,
    );

    expect(screen.queryByText("Orders")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not treat a half-written session as valid", async () => {
    // Only an access token, no refresh token.
    localStorage.setItem("access_token", "a");

    renderWithProviders(
      <AuthGuard>
        <p>Orders</p>
      </AuthGuard>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});
