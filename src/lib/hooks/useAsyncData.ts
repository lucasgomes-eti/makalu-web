"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, toApiError } from "@/lib/api/apiError";

export interface AsyncData<T> {
  data: T | undefined;
  isLoading: boolean;
  error: ApiError | null;
  /** Re-runs the loader, e.g. after a mutation. */
  reload: () => void;
}

interface Options {
  /** Skip the request entirely (e.g. a dependency is not ready yet). */
  enabled?: boolean;
  errorMessage?: string;
}

interface State<T> {
  data: T | undefined;
  error: ApiError | null;
  isFetching: boolean;
}

/**
 * Fetch-on-mount with loading/error state, re-running whenever `loader` changes.
 *
 * Results from a superseded or unmounted request are discarded — the six hand-rolled
 * copies this replaces all leaked state updates after teardown.
 *
 * `loader` must be stable; wrap it in `useCallback` at the call site. Passing an
 * inline arrow re-runs the request on every render.
 *
 * This is deliberately a small in-house hook rather than TanStack Query: the app has
 * no cross-screen cache requirements yet. If shared caching or background refetching
 * becomes necessary, replace this hook — the feature hooks are its only callers.
 */
export function useAsyncData<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  { enabled = true, errorMessage = "Could not load data." }: Options = {},
): AsyncData<T> {
  const [state, setState] = useState<State<T>>({
    data: undefined,
    error: null,
    isFetching: true,
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let isCurrent = true;

    // Entering the loading state is the point of this effect, not a cascade: the
    // request starts here, so the flag has to be raised here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((previous) => ({ ...previous, isFetching: true, error: null }));

    loader(controller.signal)
      .then((data) => {
        if (isCurrent) setState({ data, error: null, isFetching: false });
      })
      .catch((cause) => {
        // An abort is a cancellation, not a failure — the component is gone or a
        // newer request has taken over.
        if (!isCurrent || controller.signal.aborted) return;
        setState((previous) => ({
          ...previous,
          error: toApiError(cause, errorMessage),
          isFetching: false,
        }));
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [loader, enabled, reloadToken, errorMessage]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    data: state.data,
    // While disabled there is nothing in flight, so nothing to wait for.
    isLoading: enabled && state.isFetching,
    error: state.error,
    reload,
  };
}
