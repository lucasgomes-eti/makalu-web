"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/hooks/useSession";
import { POST_SIGN_IN_PATH } from "@/features/auth/hooks/useSignIn";
import { SIGN_IN_PATH } from "@/lib/api/httpClient";
import LoadingState from "@/shared/components/LoadingState";

/** Entry point: sends the visitor to the dashboard or to sign-in. */
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isResolving } = useSession();

  useEffect(() => {
    if (isResolving) return;
    router.replace(isAuthenticated ? POST_SIGN_IN_PATH : SIGN_IN_PATH);
  }, [isResolving, isAuthenticated, router]);

  return <LoadingState fullPage label="Loading Makalu" />;
}
