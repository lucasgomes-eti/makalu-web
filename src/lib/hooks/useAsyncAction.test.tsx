import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAsyncAction } from "./useAsyncAction";

describe("useAsyncAction", () => {
  it("returns the value on success", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(vi.fn().mockResolvedValue(42)),
    );

    let outcome;
    await act(async () => {
      outcome = await result.current.run();
    });

    expect(outcome).toEqual({ ok: true, value: 42 });
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it("returns the error from the call itself, not only as state", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(vi.fn().mockRejectedValue(new Error("nope")), "Save failed."),
    );

    // Reading `result.current.error` straight after an await would see the
    // pre-update render — which is exactly the stale-state bug this shape avoids.
    let outcome;
    await act(async () => {
      outcome = await result.current.run();
    });

    expect(outcome).toEqual({
      ok: false,
      error: expect.objectContaining({ message: "Save failed." }),
    });
  });

  it("exposes the failure for rendering, and clears it on request", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(vi.fn().mockRejectedValue(new Error("nope")), "Save failed."),
    );

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.error?.message).toBe("Save failed.");

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("is pending while the action is in flight", async () => {
    let release: (value: string) => void = () => {};
    const action = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve)),
    );

    const { result } = renderHook(() => useAsyncAction(action));

    let pending: Promise<unknown>;
    act(() => {
      pending = result.current.run();
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      release("done");
      await pending;
    });
    expect(result.current.isPending).toBe(false);
  });

  it("forwards its arguments to the wrapped action", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => {
      await result.current.run(7, "menu");
    });

    expect(action).toHaveBeenCalledWith(7, "menu");
  });
});
