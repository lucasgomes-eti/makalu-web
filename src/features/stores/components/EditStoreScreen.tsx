"use client";

import { useCallback } from "react";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { getStore } from "../api/storesApi";
import StoreForm from "./StoreForm";

/**
 * Loads a store, then hands it to {@link StoreForm}.
 *
 * Splitting "fetch the entity" from "edit the entity" keeps the form free of loading
 * states and lets it be rendered directly in tests with a plain object.
 */
export default function EditStoreScreen({ storeId }: { storeId: number }) {
  const loadStore = useCallback(
    (signal: AbortSignal) => getStore(storeId, signal),
    [storeId],
  );

  const { data: store, isLoading, error, reload } = useAsyncData(loadStore, {
    errorMessage: "Could not load this store.",
  });

  if (isLoading) return <LoadingState label="Loading store" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!store) return null;

  return <StoreForm store={store} />;
}
