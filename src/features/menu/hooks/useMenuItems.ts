"use client";

import { useCallback } from "react";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { useSelectedStore } from "@/features/stores/context/SelectedStoreProvider";
import { deleteMenuItem, listMenuItems } from "../api/menuApi";

/**
 * Use cases: *list the selected store's menu* and *delete a menu item*.
 *
 * The list re-fetches automatically when the selected store changes, because
 * `loadMenuItems` is re-created with the new id and `useAsyncData` depends on it.
 */
export function useMenuItems() {
  const { selectedStoreId } = useSelectedStore();

  const loadMenuItems = useCallback(
    (signal: AbortSignal) => listMenuItems(selectedStoreId as number, signal),
    [selectedStoreId],
  );

  const menu = useAsyncData(loadMenuItems, {
    enabled: selectedStoreId !== null,
    errorMessage: "Could not load the menu.",
  });

  const remove = useAsyncAction(
    useCallback(
      (menuItemId: number) =>
        deleteMenuItem(selectedStoreId as number, menuItemId),
      [selectedStoreId],
    ),
    "Could not delete this menu item.",
  );

  const removeItem = useCallback(
    async (menuItemId: number) => {
      const result = await remove.run(menuItemId);
      if (result.ok) menu.reload();
      return result.ok;
    },
    [remove, menu],
  );

  return {
    items: menu.data ?? [],
    isLoading: menu.isLoading,
    /** Failure to load the list — the table cannot be shown at all. */
    error: menu.error,
    reload: menu.reload,
    removeItem,
    isRemoving: remove.isPending,
    /**
     * Failure of a delete. Kept separate from `error` so a failed delete reports
     * itself in place, instead of replacing the table the user is looking at.
     */
    removeError: remove.error,
    hasStore: selectedStoreId !== null,
  };
}
