import { ReactNode } from "react";
import { vi } from "vitest";
import { StoreSummary } from "@/features/stores/model/store.types";

/**
 * Test double for `useSelectedStore`.
 *
 * Components under test only need "which store is selected"; standing up the real
 * provider would drag in `GET /stores/owned` for every menu test.
 */
export function mockSelectedStore(
  overrides: Partial<{
    stores: StoreSummary[];
    selectedStoreId: number | null;
  }> = {},
) {
  const value = {
    stores: overrides.stores ?? [{ id: 7, name: "Test Store", logo_image_id: null }],
    selectedStoreId:
      overrides.selectedStoreId === undefined ? 7 : overrides.selectedStoreId,
    selectedStore: null,
    selectStore: vi.fn(),
    refreshStores: vi.fn(),
    isLoading: false,
    error: null,
  };

  return {
    value,
    SelectedStoreProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useSelectedStore: () => value,
  };
}
