"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import ErrorState from "@/shared/components/ErrorState";
import ImagePicker from "@/shared/components/ImagePicker";
import PageHeader from "@/shared/components/PageHeader";
import { MenuItem, toFormValues } from "../model/menuItem.types";
import { useMenuItemForm } from "../hooks/useMenuItemForm";
import ConfigurationList from "./ConfigurationList";

interface MenuItemFormProps {
  /** The item being edited, or `undefined` to create a new one. */
  menuItem?: MenuItem;
}

/**
 * Create/edit form for a menu item.
 *
 * What was one 604-line component is now this shell plus `ConfigurationList` →
 * `ConfigurationCard` → `OptionEditor`, with all state transitions in
 * `useMenuItemForm`.
 */
export default function MenuItemForm({ menuItem }: MenuItemFormProps) {
  const router = useRouter();
  const isEdit = menuItem !== undefined;

  const {
    values,
    errors,
    setField,
    addConfiguration,
    removeConfiguration,
    updateConfiguration,
    addOption,
    removeOption,
    submit,
    isSubmitting,
    submitError,
    dismissSubmitError,
  } = useMenuItemForm({
    menuItemId: menuItem?.id,
    initialValues: menuItem ? toFormValues(menuItem) : undefined,
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
      sx={{ width: "100%", py: 2 }}
    >
      <PageHeader title={isEdit ? `Edit ${menuItem.name}` : "New menu item"} />

      {submitError && (
        <Box sx={{ mb: 2 }}>
          <ErrorState error={submitError} onDismiss={dismissSubmitError} />
        </Box>
      )}

      <Stack spacing={2}>
        <TextField
          label="Name"
          name="name"
          value={values.name}
          onChange={(event) => setField("name", event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name ?? " "}
          fullWidth
          required
        />

        <TextField
          label="Category"
          name="category"
          value={values.category}
          onChange={(event) => setField("category", event.target.value)}
          error={Boolean(errors.category)}
          helperText={errors.category ?? " "}
          fullWidth
          required
        />

        <TextField
          label="Price"
          name="price"
          type="number"
          slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
          value={values.price}
          onChange={(event) => setField("price", event.target.value)}
          error={Boolean(errors.price)}
          helperText={errors.price ?? " "}
          fullWidth
          required
        />

        <TextField
          label="Ingredients"
          name="ingredients"
          value={values.ingredients}
          onChange={(event) => setField("ingredients", event.target.value)}
          fullWidth
          multiline
          rows={2}
        />
      </Stack>

      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Photo
        </Typography>
        <ImagePicker
          variant="cover"
          label="Click to upload a photo"
          imageId={menuItem?.image_id}
          onFileSelected={(file) => setField("imageFile", file)}
          clearable
        />
      </Box>

      <ConfigurationList
        configurations={values.configurations}
        onAdd={addConfiguration}
        onRemove={removeConfiguration}
        onChange={updateConfiguration}
        onAddOption={addOption}
        onRemoveOption={removeOption}
      />

      <Stack
        direction="row"
        spacing={2}
        sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}
      >
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
        <Button
          variant="outlined"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </Stack>
    </Box>
  );
}
