"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { tokenStorage } from "@/lib/auth/tokenStorage";
import { SIGN_IN_PATH } from "@/lib/api/httpClient";

/**
 * Use case: *sign out*. Discards the tokens and returns to the sign-in screen.
 */
export function useSignOut() {
  const router = useRouter();

  return useCallback(() => {
    tokenStorage.clear();
    router.replace(SIGN_IN_PATH);
  }, [router]);
}
