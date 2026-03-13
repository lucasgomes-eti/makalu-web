import * as React from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

interface UploadCoverImageProps {
  onFileChange: (file: File | null) => void;
}

const CoverContainer = styled(ButtonBase)(({ theme }) => ({
  width: "100%",
  height: 200,
  borderRadius: "8px",
  border: `2px dashed ${(theme as any).palette.divider}`,
  overflow: "hidden",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: (theme as any).palette.action.hover,
  transition: theme.transitions.create(["border-color", "background-color"]),
  "&:hover": {
    borderColor: (theme as any).palette.primary.main,
    backgroundColor: (theme as any).palette.action.selected,
  },
  "&:has(:focus-visible)": {
    outline: "2px solid",
    outlineColor: (theme as any).palette.primary.main,
    outlineOffset: "2px",
  },
}));

const CoverImage = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

const UploadPlaceholder = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1),
  color: (theme as any).palette.text.secondary,
  pointerEvents: "none",
}));

export default function UploadCoverImage({
  onFileChange,
}: UploadCoverImageProps) {
  const [coverSrc, setCoverSrc] = React.useState<string | undefined>(undefined);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCoverSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileChange(file);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <CoverContainer
      role={undefined}
      tabIndex={-1}
      aria-label="Cover image"
      onClick={handleButtonClick}
    >
      {coverSrc ? (
        <CoverImage src={coverSrc} alt="Store cover" />
      ) : (
        <UploadPlaceholder>
          <CloudUploadIcon sx={{ fontSize: 40 }} />
          <span>Click to upload cover image</span>
        </UploadPlaceholder>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{
          border: 0,
          clip: "rect(0 0 0 0)",
          height: "1px",
          margin: "-1px",
          overflow: "hidden",
          padding: 0,
          position: "absolute",
          whiteSpace: "nowrap",
          width: "1px",
        }}
        onChange={handleCoverChange}
      />
    </CoverContainer>
  );
}
