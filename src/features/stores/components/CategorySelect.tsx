"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useAsyncData } from "@/lib/hooks/useAsyncData";
import { listCategories } from "../api/storesApi";

interface CategorySelectProps {
  value: number[];
  onChange: (categoryIds: number[]) => void;
  error?: string;
}

const LABEL_ID = "store-categories-label";

/** Multi-select of store categories; owns loading its own options. */
export default function CategorySelect({
  value,
  onChange,
  error,
}: CategorySelectProps) {
  const { data: categories, isLoading } = useAsyncData(listCategories, {
    errorMessage: "Could not load categories.",
  });

  const describe = (categoryId: number) =>
    categories?.find((category) => category.id === categoryId)?.description ??
    `#${categoryId}`;

  return (
    <FormControl error={Boolean(error)} fullWidth>
      <InputLabel id={LABEL_ID}>Categories</InputLabel>
      <Select
        labelId={LABEL_ID}
        label="Categories"
        name="categories_ids"
        multiple
        value={value}
        disabled={isLoading}
        onChange={(event) => onChange(event.target.value as number[])}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected.map((categoryId) => (
              <Chip key={categoryId} label={describe(categoryId)} size="small" />
            ))}
          </Box>
        )}
      >
        {(categories ?? []).map((category) => (
          <MenuItem key={category.id} value={category.id}>
            {category.description}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{error ?? " "}</FormHelperText>
    </FormControl>
  );
}
