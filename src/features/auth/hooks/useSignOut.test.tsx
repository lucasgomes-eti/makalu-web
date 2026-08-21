import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "@/lib/auth/tokenStorage";
import { useSignOut } from "./useSignOut";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("useSignOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("discards the session and returns to sign-in", () => {
    tokenStorage.save({ access_token: "a", refresh_token: "r" }, { remember: true });

    const { result } = renderHook(() => useSignOut());
    act(() => result.current());

    expect(tokenStorage.hasSession()).toBe(false);
    expect(replace).toHaveBeenCalledWith("/sign-in");
  });

  it("is safe to call when there is no session", () => {
    const { result } = renderHook(() => useSignOut());

    expect(() => act(() => result.current())).not.toThrow();
    expect(replace).toHaveBeenCalledWith("/sign-in");
  });
});
