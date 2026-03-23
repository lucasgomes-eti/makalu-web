import * as React from "react";
import Avatar from "@mui/material/Avatar";
import ButtonBase from "@mui/material/ButtonBase";

interface UploadLogoImageProps {
  onFileChange: (file: File | null) => void;
  imageId?: number | null;
}

export default function UploadLogoImage({
  onFileChange,
  imageId,
}: UploadLogoImageProps) {
  const [avatarSrc, setAvatarSrc] = React.useState<string | undefined>(
    imageId
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/stores/logo-image/${imageId}`
      : undefined,
  );

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Read the file as a data URL
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileChange(file);
    }
  };

  return (
    <ButtonBase
      component="label"
      role={undefined}
      tabIndex={-1}
      aria-label="Logo image"
      sx={{
        borderRadius: "40px",
        "&:has(:focus-visible)": {
          outline: "2px solid",
          outlineOffset: "2px",
        },
      }}
    >
      <Avatar
        alt="Upload store logo"
        src={avatarSrc}
        sx={{
          width: 180,
          height: 180,
        }}
      />
      <input
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
        onChange={handleAvatarChange}
      />
    </ButtonBase>
  );
}
