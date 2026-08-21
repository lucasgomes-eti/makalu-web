import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
} from "@/test/renderWithProviders";
import { tokenStorage } from "@/lib/auth/tokenStorage";
import { login } from "../api/authApi";
import SignInForm from "./SignInForm";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../api/authApi", () => ({ login: vi.fn() }));

const mockLogin = vi.mocked(login);
const tokens = { access_token: "access-1", refresh_token: "refresh-1" };

async function fillIn(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  return user;
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("signs the user in and sends them to the dashboard", async () => {
    mockLogin.mockResolvedValue(tokens);
    renderWithProviders(<SignInForm />);

    const user = await fillIn("owner@makalu.com", "supersecret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        email: "owner@makalu.com",
        password: "supersecret",
      }),
    );
    expect(replace).toHaveBeenCalledWith("/dashboard/orders");
  });

  it("persists the session across restarts when 'Remember me' is checked", async () => {
    mockLogin.mockResolvedValue(tokens);
    renderWithProviders(<SignInForm />);

    const user = await fillIn("owner@makalu.com", "supersecret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(localStorage.getItem("access_token")).toBe("access-1"));
    expect(sessionStorage.getItem("access_token")).toBeNull();
  });

  it("keeps the session to the tab when 'Remember me' is unchecked", async () => {
    mockLogin.mockResolvedValue(tokens);
    renderWithProviders(<SignInForm />);

    const user = await fillIn("owner@makalu.com", "supersecret");
    await user.click(screen.getByRole("checkbox", { name: "Remember me" }));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(sessionStorage.getItem("access_token")).toBe("access-1"),
    );
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("does not call the API when the email is malformed", async () => {
    renderWithProviders(<SignInForm />);

    const user = await fillIn("not-an-email", "supersecret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Please enter a valid email address."),
    ).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("does not call the API when the password is too short", async () => {
    renderWithProviders(<SignInForm />);

    const user = await fillIn("owner@makalu.com", "short");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText(/at least 8 characters/i),
    ).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("blocks the very first invalid submit, not just later ones", async () => {
    // Regression: validation used to write to state and then read the pre-update
    // value in the same event, so the first bad submit still hit the network.
    renderWithProviders(<SignInForm />);

    const user = await fillIn("bad", "x");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mockLogin).not.toHaveBeenCalled();
    expect(tokenStorage.hasSession()).toBe(false);
  });

  it("shows the backend's message, not Axios' generic one", async () => {
    const config = { headers: new AxiosHeaders() };
    mockLogin.mockRejectedValue(
      new AxiosError("Request failed with status code 401", "ERR", config, null, {
        status: 401,
        data: {
          http_code: 401,
          message: "Invalid email or password",
          internal_code: "AUTH_001",
        },
        statusText: "",
        headers: {},
        config,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    );
    renderWithProviders(<SignInForm />);

    const user = await fillIn("owner@makalu.com", "supersecret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("(AUTH_001) Invalid email or password"),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not store tokens when authentication fails", async () => {
    mockLogin.mockRejectedValue(new Error("nope"));
    renderWithProviders(<SignInForm />);

    const user = await fillIn("owner@makalu.com", "supersecret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("alert");
    expect(tokenStorage.hasSession()).toBe(false);
  });

  it("disables the submit button while signing in", async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<SignInForm />);

    const user = await fillIn("owner@makalu.com", "supersecret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();
  });
});
