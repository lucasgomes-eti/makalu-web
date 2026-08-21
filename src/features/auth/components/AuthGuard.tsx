"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SIGN_IN_PATH } from "@/lib/api/httpClient";
import LoadingState from "@/shared/components/LoadingState";
import { useSession } from "../hooks/useSession";

/**
 * Renders `children` only for a signed-in user, redirecting to sign-in otherwise.
 *
 * This is a *convenience* guard, not a security boundary: tokens live in browser
 * storage, so the check can only run client-side. The API authorises every request
 * independently — see "Security model" in the README.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isResolving } = useSession();

  useEffect(() => {
    if (!isResolving && !isAuthenticated) {
      router.replace(SIGN_IN_PATH);
    }
  }, [isResolving, isAuthenticated, router]);

  if (isResolving || !isAuthenticated) {
    return <LoadingState fullPage label="Checking your session" />;
  }

  return <>{children}</>;
}
