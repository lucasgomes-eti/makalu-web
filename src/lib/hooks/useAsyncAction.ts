"use client";

import { useCallback, useState } from "react";
import { ApiError, toApiError } from "@/lib/api/apiError";

/**
 * Outcome of one run. Returning the error *from the call* — rather than only
 * exposing it as state — lets callers react to it immediately; reading `action.error`
 * right after `await run()` would see the pre-update render's value.
 */
export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApiError };

export interface AsyncAction<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<ActionResult<TResult>>;
  isPending: boolean;
  /** Last failure, for rendering. `null` while pending or after success. */
  error: ApiError | null;
  clearError: () => void;
}

/**
 * Wraps a user-triggered write (submit, delete, upload) with pending and error state.
 *
 * ```ts
 * const result = await save.run(values);
 * if (result.ok) router.push(`/stores/${result.value}`);
 * else setFieldErrors(result.error.fieldErrors);
 * ```
 *
 * `action` must be stable — wrap it in `useCallback` at the call site.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  errorMessage = "The operation failed. Please try again.",
): AsyncAction<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = useCallback(
    async (...args: TArgs): Promise<ActionResult<TResult>> => {
      setIsPending(true);
      setError(null);
      try {
        return { ok: true, value: await action(...args) };
      } catch (cause) {
        const apiError = toApiError(cause, errorMessage);
        setError(apiError);
        return { ok: false, error: apiError };
      } finally {
        setIsPending(false);
      }
    },
    [action, errorMessage],
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, isPending, error, clearError };
}
