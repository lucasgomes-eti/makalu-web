import { act, renderHook, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useAsyncData } from "./useAsyncData";

describe("useAsyncData", () => {
  it("starts loading, then exposes the resolved data", async () => {
    const loader = vi.fn().mockResolvedValue(["a", "b"]);

    const { result } = renderHook(() => useAsyncData(loader));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(["a", "b"]);
    expect(result.current.error).toBeNull();
  });

  it("normalises a rejection into an ApiError", async () => {
    const loader = vi.fn().mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() =>
      useAsyncData(loader, { errorMessage: "Could not load stores." }),
    );

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("Could not load stores.");
    expect(result.current.data).toBeUndefined();
  });

  it("does not run the loader while disabled", async () => {
    const loader = vi.fn().mockResolvedValue("x");

    const { result } = renderHook(() => useAsyncData(loader, { enabled: false }));

    expect(loader).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("runs the loader once the gate opens", async () => {
    const loader = vi.fn().mockResolvedValue("x");

    const { result, rerender } = renderHook(
      ({ enabled }) => useAsyncData(loader, { enabled }),
      { initialProps: { enabled: false } },
    );

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.data).toBe("x"));
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("re-fetches on reload", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    const { result } = renderHook(() => useAsyncData(loader));
    await waitFor(() => expect(result.current.data).toBe("first"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.data).toBe("second"));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("re-fetches when the loader identity changes", async () => {
    const fetchById = vi.fn((id: number) => Promise.resolve(`store-${id}`));

    function useSubject() {
      const [id, setId] = useState(1);
      const loader = useCallback(() => fetchById(id), [id]);
      return { ...useAsyncData(loader), setId };
    }

    const { result } = renderHook(useSubject);
    await waitFor(() => expect(result.current.data).toBe("store-1"));

    act(() => result.current.setId(2));

    await waitFor(() => expect(result.current.data).toBe("store-2"));
  });

  it("aborts the in-flight request when it unmounts", async () => {
    let capturedSignal: AbortSignal | undefined;
    const loader = vi.fn((signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<string>(() => {});
    });

    const { unmount } = renderHook(() => useAsyncData(loader));
    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("ignores a rejection caused by its own abort", async () => {
    const loader = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    const { result, unmount } = renderHook(() => useAsyncData(loader));
    unmount();

    await Promise.resolve();
    expect(result.current.error).toBeNull();
  });
});
