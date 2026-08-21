"use client";

import * as React from "react";
import { ApiError } from "@/lib/api/apiError";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { listOwnedStores } from "../api/storesApi";
import { StoreSummary } from "../model/store.types";
import { selectedStorePreference } from "../model/selectedStorePreference";

interface SelectedStoreContextValue {
  stores: StoreSummary[];
  selectedStoreId: number | null;
  selectedStore: StoreSummary | null;
  selectStore: (storeId: number) => void;
  /** Re-fetches the list, e.g. after a store is created or renamed. */
  refreshStores: () => void;
  isLoading: boolean;
  error: ApiError | null;
}

const SelectedStoreContext =
  React.createContext<SelectedStoreContextValue | null>(null);

/**
 * Owns "which store am I managing?" for the whole dashboard.
 *
 * This replaces a DOM `CustomEvent` bus plus three independent `sessionStorage`
 * reads. Because it is ordinary React state, every consumer re-renders on change,
 * the value is typed, and tests can drive it by rendering the provider.
 */
export function SelectedStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedStoreId, setSelectedStoreId] = React.useState<number | null>(null);

  const {
    data: stores,
    isLoading,
    error,
    reload: refreshStores,
  } = useAsyncData(listOwnedStores, { errorMessage: "Could not load your stores." });

  // Resolve the selection whenever the list changes: keep the remembered store if it
  // is still owned, otherwise fall back to the first one.
  React.useEffect(() => {
    if (!stores) return;

    setSelectedStoreId((current) => {
      const candidates = [current, selectedStorePreference.read()];
      const stillValid = candidates.find(
        (id) => id !== null && stores.some((store) => store.id === id),
      );

      return stillValid ?? stores[0]?.id ?? null;
    });
  }, [stores]);

  React.useEffect(() => {
    if (selectedStoreId !== null) selectedStorePreference.write(selectedStoreId);
  }, [selectedStoreId]);

  const value = React.useMemo<SelectedStoreContextValue>(
    () => ({
      stores: stores ?? [],
      selectedStoreId,
      selectedStore:
        stores?.find((store) => store.id === selectedStoreId) ?? null,
      selectStore: setSelectedStoreId,
      refreshStores,
      isLoading,
      error,
    }),
    [stores, selectedStoreId, refreshStores, isLoading, error],
  );

  return (
    <SelectedStoreContext.Provider value={value}>
      {children}
    </SelectedStoreContext.Provider>
  );
}

/**
 * Reads the selected-store context.
 *
 * @throws when used outside `SelectedStoreProvider` — a wiring mistake that should
 * fail loudly rather than silently render an empty menu.
 */
export function useSelectedStore(): SelectedStoreContextValue {
  const context = React.useContext(SelectedStoreContext);
  if (!context) {
    throw new Error("useSelectedStore must be used within a SelectedStoreProvider");
  }
  return context;
}
