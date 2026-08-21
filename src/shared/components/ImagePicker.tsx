"use client";

import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { imageUrl, readAsDataUrl } from "@/lib/api/media";

export type ImagePickerVariant = "avatar" | "cover";

interface ImagePickerProps {
  /** Circular thumbnail (logos, profiles) or a wide banner (covers, dish photos). */
  variant: ImagePickerVariant;
  /** Accessible name, also used as the placeholder prompt. */
  label: string;
  /** Id of the image already stored on the server, if any. */
  imageId?: number | null;
  /** Called with the chosen file, or `null` when the selection is cleared. */
  onFileSelected: (file: File | null) => void;
  /** Offer a button to discard the pending selection. */
  clearable?: boolean;
}

const VISUALLY_HIDDEN = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute" as const,
  whiteSpace: "nowrap" as const,
  width: "1px",
};

// A `label` rather than a styled `ButtonBase`: the whole surface must be the
// hidden file input's label, and `styled()` does not carry MUI's polymorphic
// `component` prop through to TypeScript.
const CoverSurface = styled("label")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  width: "100%",
  height: 200,
  borderRadius: theme.shape.borderRadius,
  border: `2px dashed ${(theme.vars || theme).palette.divider}`,
  overflow: "hidden",
  position: "relative",
  backgroundColor: (theme.vars || theme).palette.action.hover,
  transition: theme.transitions.create(["border-color", "background-color"]),
  "&:hover": {
    borderColor: (theme.vars || theme).palette.primary.main,
    backgroundColor: (theme.vars || theme).palette.action.selected,
  },
  "&:has(:focus-visible)": {
    outline: "2px solid",
    outlineColor: (theme.vars || theme).palette.primary.main,
    outlineOffset: "2px",
  },
}));

const CoverImage = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

/**
 * File input for a single image, with a live preview.
 *
 * The component never uploads anything — it hands the `File` to its parent, which
 * submits it as part of the surrounding save. That keeps "pick an image" and "save
 * the entity" as one atomic user action.
 */
export default function ImagePicker({
  variant,
  label,
  imageId,
  onFileSelected,
  clearable = false,
}: ImagePickerProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Falls back to the persisted image until the user picks a replacement.
  const displayedSrc = previewUrl ?? imageUrl(imageId);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    onFileSelected(file);
    setPreviewUrl(await readAsDataUrl(file));
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onFileSelected(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      aria-label={label}
      style={VISUALLY_HIDDEN}
      onChange={handleChange}
    />
  );

  // The accessible name lives on the file input — the actual control. Repeating it
  // on the wrapping label would announce the same name twice.
  if (variant === "avatar") {
    return (
      <ButtonBase
        component="label"
        sx={{
          borderRadius: "50%",
          "&:has(:focus-visible)": { outline: "2px solid", outlineOffset: "2px" },
        }}
      >
        <Avatar alt={label} src={displayedSrc} sx={{ width: 180, height: 180 }} />
        {fileInput}
      </ButtonBase>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <CoverSurface>
        {displayedSrc ? (
          <CoverImage src={displayedSrc} alt={label} />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              color: "text.secondary",
              pointerEvents: "none",
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 40 }} />
            <Typography variant="body2">{label}</Typography>
          </Box>
        )}
        {fileInput}
      </CoverSurface>

      {clearable && selectedFile && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Selected: {selectedFile.name}
          </Typography>
          <Button size="small" color="error" onClick={handleClear}>
            Clear
          </Button>
        </Box>
      )}
    </Box>
  );
}
