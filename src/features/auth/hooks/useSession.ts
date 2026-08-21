"use client";

import { useEffect, useState } from "react";
import { tokenStorage } from "@/lib/auth/tokenStorage";

export interface Session {
  isAuthenticated: boolean;
  /** True until the browser-only token check has run. */
  isResolving: boolean;
}

/**
 * Reports whether a session exists.
 *
 * Storage is only readable in the browser, so the answer is unknown during SSR and
 * the first render — callers must render a loading state while `isResolving`.
 *
 * Unlike the hook it replaces, this has no side effects: HTTP auth is configured once
 * by `lib/api/httpClient`, not by whichever component mounted first.
 */
export function useSession(): Session {
  const [session, setSession] = useState<Session>({
    isAuthenticated: false,
    isResolving: true,
  });

  useEffect(() => {
    // A deliberate one-shot read of an external store after hydration. It cannot
    // happen during render: the server has no storage, so a render-time read would
    // produce a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({
      isAuthenticated: tokenStorage.hasSession(),
      isResolving: false,
    });
  }, []);

  return session;
}
