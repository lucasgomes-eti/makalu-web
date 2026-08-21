"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncAction } from "@/lib/hooks/useAsyncAction";
import { saveStore } from "../api/storesApi";
import {
  StoreFormErrors,
  StoreFormValues,
  EMPTY_STORE_FORM,
} from "../model/store.types";
import { toStoreFormErrors, validateStore } from "../model/validateStore";
import { useSelectedStore } from "../context/SelectedStoreProvider";

interface UseStoreFormOptions {
  /** Omit to create a new store. */
  storeId?: number;
  initialValues?: StoreFormValues;
}

/**
 * Use case: *create a store* / *update a store*.
 *
 * Holds the form values, runs client-side validation, delegates the write to
 * `saveStore`, folds any server-side `field_errors` back onto the form, refreshes the
 * store switcher, and navigates back — in that order.
 *
 * This replaces a 130-line `handleSubmit` with ~20 branch points, two silent failure
 * paths, and inline upload try/catches.
 */
export function useStoreForm({ storeId, initialValues }: UseStoreFormOptions) {
  const router = useRouter();
  const { refreshStores, selectStore } = useSelectedStore();

  const [values, setValues] = useState<StoreFormValues>(
    initialValues ?? EMPTY_STORE_FORM,
  );
  const [errors, setErrors] = useState<StoreFormErrors>({});

  const setField = useCallback(
    <K extends keyof StoreFormValues>(field: K, value: StoreFormValues[K]) => {
      setValues((previous) => ({ ...previous, [field]: value }));
      // Clearing on edit keeps a stale message from contradicting what the user
      // is currently typing.
      setErrors((previous) =>
        previous[field] ? { ...previous, [field]: undefined } : previous,
      );
    },
    [],
  );

  const setLocation = useCallback((latitude: number, longitude: number) => {
    setValues((previous) => ({ ...previous, latitude, longitude }));
    setErrors((previous) => ({ ...previous, latitude: undefined }));
  }, []);

  const save = useAsyncAction(
    useCallback(
      (formValues: StoreFormValues) => saveStore(formValues, storeId),
      [storeId],
    ),
    storeId ? "Could not update the store." : "Could not create the store.",
  );

  const submit = useCallback(async () => {
    const validationErrors = validateStore(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const result = await save.run(values);

    if (!result.ok) {
      // The banner shows the message; also highlight the offending fields.
      setErrors(toStoreFormErrors(result.error.fieldErrors));
      return;
    }

    refreshStores();
    selectStore(result.value);
    router.back();
  }, [values, save, refreshStores, selectStore, router]);

  return {
    values,
    errors,
    setField,
    setLocation,
    submit,
    isSubmitting: save.isPending,
    submitError: save.error,
    dismissSubmitError: save.clearError,
  };
}
