"use client";

import { useCallback } from "react";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { getMenuItem } from "../api/menuApi";
import MenuItemForm from "./MenuItemForm";

/** Loads a menu item, then hands it to {@link MenuItemForm}. */
export default function EditMenuItemScreen({
  menuItemId,
}: {
  menuItemId: number;
}) {
  const loadMenuItem = useCallback(
    (signal: AbortSignal) => getMenuItem(menuItemId, signal),
    [menuItemId],
  );

  const { data: menuItem, isLoading, error, reload } = useAsyncData(loadMenuItem, {
    errorMessage: "Could not load this menu item.",
  });

  if (isLoading) return <LoadingState label="Loading menu item" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!menuItem) return null;

  return <MenuItemForm menuItem={menuItem} />;
}
