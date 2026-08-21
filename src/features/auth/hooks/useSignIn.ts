"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { tokenStorage } from "@/lib/auth/tokenStorage";
import { login } from "../api/authApi";
import { CredentialErrors, SignInInput } from "../model/auth.types";
import { hasErrors, validateCredentials } from "../model/validateCredentials";

/** Where a successful sign-in lands. */
export const POST_SIGN_IN_PATH = "/dashboard/orders";

/**
 * Use case: *sign in*.
 *
 * Validate → authenticate → persist tokens → enter the dashboard. The form component
 * only collects input and renders whatever this returns.
 */
export function useSignIn() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});

  const authenticate = useAsyncAction(
    useCallback(async ({ remember, ...credentials }: SignInInput) => {
      const tokens = await login(credentials);
      tokenStorage.save(tokens, { remember });
      return tokens;
    }, []),
    "Could not sign in. Please check your credentials.",
  );

  const signIn = useCallback(
    async (input: SignInInput) => {
      const validationErrors = validateCredentials(input);
      setFieldErrors(validationErrors);
      if (hasErrors(validationErrors)) return;

      const result = await authenticate.run(input);
      if (!result.ok) return;

      // `replace`, so Back does not return to the sign-in form of a live session.
      router.replace(POST_SIGN_IN_PATH);
    },
    [authenticate, router],
  );

  return {
    signIn,
    fieldErrors,
    isSubmitting: authenticate.isPending,
    error: authenticate.error,
    dismissError: authenticate.clearError,
  };
}
