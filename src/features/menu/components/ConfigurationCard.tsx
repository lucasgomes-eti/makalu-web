"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  CONFIGURATION_TYPES,
  CONFIGURATION_TYPE_LABELS,
  Configuration,
  ConfigurationDraft,
  ConfigurationType,
  Option,
} from "../model/menuItem.types";
import OptionEditor from "./OptionEditor";

interface ConfigurationCardProps {
  configuration: ConfigurationDraft;
  onChange: <K extends keyof Configuration>(
    field: K,
    value: Configuration[K],
  ) => void;
  onRemove: () => void;
  onAddOption: (option: Option) => void;
  onRemoveOption: (optionIndex: number) => void;
}

/** Editor for one configuration group (its name, type, and options). */
export default function ConfigurationCard({
  configuration,
  onChange,
  onRemove,
  onAddOption,
  onRemoveOption,
}: ConfigurationCardProps) {
  const typeLabelId = `configuration-type-${configuration.key}`;

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 2, "&:last-child": { pb: 2 } }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Configuration name"
              value={configuration.name}
              onChange={(event) => onChange("name", event.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id={typeLabelId}>Type</InputLabel>
              <Select
                labelId={typeLabelId}
                label="Type"
                value={configuration.type}
                onChange={(event) =>
                  onChange("type", event.target.value as ConfigurationType)
                }
              >
                {CONFIGURATION_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {CONFIGURATION_TYPE_LABELS[type]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <OptionEditor
          options={configuration.options}
          onAdd={onAddOption}
          onRemove={onRemoveOption}
        />

        <Button
          size="small"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onRemove}
        >
          Remove configuration
        </Button>
      </CardContent>
    </Card>
  );
}
