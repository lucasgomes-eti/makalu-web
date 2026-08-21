"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import ErrorState from "@/shared/components/ErrorState";
import ImagePicker from "@/shared/components/ImagePicker";
import PageHeader from "@/shared/components/PageHeader";
import { Store } from "../model/store.types";
import { useStoreForm } from "../hooks/useStoreForm";
import CategorySelect from "./CategorySelect";
import LocationPicker from "./LocationPicker";
import { toFormValues } from "../model/store.types";

interface StoreFormProps {
  /** The store being edited, or `undefined` to create a new one. */
  store?: Store;
}

/**
 * Create/edit form for a store.
 *
 * Presentation only: every state transition and the save sequence live in
 * `useStoreForm`, so this file reads top-to-bottom as the shape of the screen.
 */
export default function StoreForm({ store }: StoreFormProps) {
  const router = useRouter();
  const isEdit = store !== undefined;

  const {
    values,
    errors,
    setField,
    setLocation,
    submit,
    isSubmitting,
    submitError,
    dismissSubmitError,
  } = useStoreForm({
    storeId: store?.id,
    initialValues: store ? toFormValues(store) : undefined,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      sx={{ width: "100%" }}
    >
      <PageHeader title={isEdit ? `Edit ${store.name}` : "New store"} />

      {submitError && (
        <Box sx={{ mb: 2 }}>
          <ErrorState error={submitError} onDismiss={dismissSubmitError} />
        </Box>
      )}

      <Stack spacing={2}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <ImagePicker
            variant="avatar"
            label="Store logo"
            imageId={store?.logo_image_id}
            onFileSelected={(file) => setField("logoFile", file)}
          />
        </Box>

        <ImagePicker
          variant="cover"
          label="Click to upload a cover image"
          imageId={store?.cover_image_id}
          onFileSelected={(file) => setField("coverFile", file)}
          clearable
        />

        <LocationPicker
          latitude={values.latitude}
          longitude={values.longitude}
          onLocationChange={setLocation}
          error={errors.latitude}
        />

        <TextField
          name="name"
          label="Name"
          value={values.name}
          onChange={(event) => setField("name", event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name ?? " "}
          fullWidth
          required
        />

        <TextField
          name="delivery_fee"
          label="Delivery fee"
          type="number"
          value={values.deliveryFee}
          onChange={(event) => setField("deliveryFee", event.target.value)}
          slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
          error={Boolean(errors.deliveryFee)}
          helperText={errors.deliveryFee ?? " "}
          fullWidth
          required
        />

        <CategorySelect
          value={values.categoryIds}
          onChange={(categoryIds) => setField("categoryIds", categoryIds)}
          error={errors.categoryIds}
        />
      </Stack>

      <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create store"}
        </Button>
      </Stack>
    </Box>
  );
}
