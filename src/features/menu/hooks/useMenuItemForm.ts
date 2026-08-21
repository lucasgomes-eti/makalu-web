"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { useSelectedStore } from "@/features/stores/context/SelectedStoreProvider";
import { saveMenuItem } from "../api/menuApi";
import {
  Configuration,
  ConfigurationDraft,
  EMPTY_MENU_ITEM_FORM,
  MenuItemFormErrors,
  MenuItemFormValues,
  Option,
  newConfiguration,
} from "../model/menuItem.types";
import { validateMenuItem } from "../model/validateMenuItem";

interface UseMenuItemFormOptions {
  /** Omit to create a new menu item. */
  menuItemId?: number;
  initialValues?: MenuItemFormValues;
}

/**
 * Use cases: *create a menu item*, *update a menu item*, and every configuration and
 * option edit in between.
 *
 * All list mutations are expressed as pure transformations of the previous state, so
 * the form component contains no state logic at all.
 */
export function useMenuItemForm({
  menuItemId,
  initialValues,
}: UseMenuItemFormOptions) {
  const router = useRouter();
  const { selectedStoreId } = useSelectedStore();

  const [values, setValues] = useState<MenuItemFormValues>(
    initialValues ?? EMPTY_MENU_ITEM_FORM,
  );
  const [errors, setErrors] = useState<MenuItemFormErrors>({});

  const setField = useCallback(
    <K extends keyof MenuItemFormValues>(
      field: K,
      value: MenuItemFormValues[K],
    ) => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) =>
        field in previous ? { ...previous, [field]: undefined } : previous,
      );
    },
    [],
  );

  const mapConfigurations = useCallback(
    (
      transform: (configurations: ConfigurationDraft[]) => ConfigurationDraft[],
    ) => {
      setValues((previous) => ({
        ...previous,
        configurations: transform(previous.configurations),
      }));
    },
    [],
  );

  const addConfiguration = useCallback(() => {
    mapConfigurations((configurations) => [
      ...configurations,
      newConfiguration(),
    ]);
  }, [mapConfigurations]);

  const removeConfiguration = useCallback(
    (key: string) => {
      mapConfigurations((configurations) =>
        configurations.filter((configuration) => configuration.key !== key),
      );
    },
    [mapConfigurations],
  );

  /**
   * Updates one field of one configuration. Generic over `keyof Configuration`, so
   * a typo in the field name or a mismatched value is a compile error — the previous
   * signature was `(index: number, field: string, value: any)`.
   */
  const updateConfiguration = useCallback(
    <K extends keyof Configuration>(
      key: string,
      field: K,
      value: Configuration[K],
    ) => {
      mapConfigurations((configurations) =>
        configurations.map((configuration) =>
          configuration.key === key
            ? { ...configuration, [field]: value }
            : configuration,
        ),
      );
    },
    [mapConfigurations],
  );

  const addOption = useCallback(
    (key: string, option: Option) => {
      mapConfigurations((configurations) =>
        configurations.map((configuration) =>
          configuration.key === key
            ? { ...configuration, options: [...configuration.options, option] }
            : configuration,
        ),
      );
    },
    [mapConfigurations],
  );

  const removeOption = useCallback(
    (key: string, optionIndex: number) => {
      mapConfigurations((configurations) =>
        configurations.map((configuration) =>
          configuration.key === key
            ? {
                ...configuration,
                options: configuration.options.filter(
                  (_, index) => index !== optionIndex,
                ),
              }
            : configuration,
        ),
      );
    },
    [mapConfigurations],
  );

  const save = useAsyncAction(
    useCallback(
      (formValues: MenuItemFormValues) =>
        saveMenuItem(selectedStoreId as number, formValues, menuItemId),
      [selectedStoreId, menuItemId],
    ),
    menuItemId
      ? "Could not update this menu item."
      : "Could not create the menu item.",
  );

  const submit = useCallback(async () => {
    const validationErrors = validateMenuItem(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const result = await save.run(values);
    if (result.ok) router.push("/dashboard/menu");
  }, [values, save, router]);

  return {
    values,
    errors,
    setField,
    addConfiguration,
    removeConfiguration,
    updateConfiguration,
    addOption,
    removeOption,
    submit,
    isSubmitting: save.isPending,
    submitError: save.error,
    dismissSubmitError: save.clearError,
  };
}
