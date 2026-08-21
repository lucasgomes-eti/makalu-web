"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import {
  Configuration,
  ConfigurationDraft,
  Option,
} from "../model/menuItem.types";
import ConfigurationCard from "./ConfigurationCard";

interface ConfigurationListProps {
  configurations: ConfigurationDraft[];
  onAdd: () => void;
  onRemove: (key: string) => void;
  onChange: <K extends keyof Configuration>(
    key: string,
    field: K,
    value: Configuration[K],
  ) => void;
  onAddOption: (key: string, option: Option) => void;
  onRemoveOption: (key: string, optionIndex: number) => void;
}

/** The "Configurations" section of the menu item form. */
export default function ConfigurationList({
  configurations,
  onAdd,
  onRemove,
  onChange,
  onAddOption,
  onRemoveOption,
}: ConfigurationListProps) {
  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" component="h2">
          Configurations
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAdd}
        >
          Add configuration
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {configurations.map((configuration) => (
          <ConfigurationCard
            key={configuration.key}
            configuration={configuration}
            onChange={(field, value) => onChange(configuration.key, field, value)}
            onRemove={() => onRemove(configuration.key)}
            onAddOption={(option) => onAddOption(configuration.key, option)}
            onRemoveOption={(optionIndex) =>
              onRemoveOption(configuration.key, optionIndex)
            }
          />
        ))}
      </Box>
    </Box>
  );
}
