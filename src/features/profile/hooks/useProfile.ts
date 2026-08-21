"use client";

import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { getProfile } from "../api/profileApi";

/**
 * Use case: *show who is signed in*.
 *
 * Consumed by both the desktop and mobile navigation, which previously showed a
 * hardcoded name on mobile.
 */
export function useProfile() {
  const { data, isLoading } = useAsyncData(getProfile, {
    errorMessage: "Could not load your profile.",
  });

  return { profile: data ?? null, isLoading };
}
