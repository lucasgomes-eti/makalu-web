"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import AddIcon from "@mui/icons-material/Add";
import { formatSurcharge, parseAmount } from "@/lib/format/currency";
import { Option } from "../model/menuItem.types";

interface OptionEditorProps {
  options: Option[];
  onAdd: (option: Option) => void;
  onRemove: (optionIndex: number) => void;
}

const BLANK_OPTION: Option = { name: "", additional_price: 0 };

/**
 * Lists a configuration's options as chips and collects new ones.
 *
 * The draft option is local state: it is not part of the menu item until the user
 * confirms it, so it has no business living in the form-wide values.
 */
export default function OptionEditor({
  options,
  onAdd,
  onRemove,
}: OptionEditorProps) {
  const [draft, setDraft] = React.useState<Option>(BLANK_OPTION);
  const [isAdding, setIsAdding] = React.useState(false);

  const reset = () => {
    setDraft(BLANK_OPTION);
    setIsAdding(false);
  };

  const commit = () => {
    if (!draft.name.trim()) return;
    onAdd({ ...draft, name: draft.name.trim() });
    reset();
  };

  const label = (option: Option) => {
    const surcharge = formatSurcharge(option.additional_price);
    return surcharge ? `${option.name} (${surcharge})` : option.name;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
        {isAdding ? (
          <>
            <TextField
              size="small"
              label="Option name"
              autoFocus
              value={draft.name}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                commit();
              }}
            />
            <TextField
              size="small"
              label="Additional price"
              type="number"
              slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
              value={draft.additional_price}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  additional_price: parseAmount(event.target.value),
                }))
              }
              sx={{ width: 160 }}
            />
            <Button size="small" variant="contained" onClick={commit}>
              Add
            </Button>
            <Button size="small" variant="outlined" onClick={reset}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setIsAdding(true)}
          >
            Add option
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {options.map((option, index) => (
          <Chip
            key={`${option.name}-${index}`}
            label={label(option)}
            onDelete={() => onRemove(index)}
          />
        ))}
      </Box>
    </Box>
  );
}
