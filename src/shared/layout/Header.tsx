"use client";

import Stack from "@mui/material/Stack";
import ColorModeIconDropdown from "@/shared/theme/ColorModeIconDropdown";
import NavbarBreadcrumbs from "./NavbarBreadcrumbs";

/** Desktop top bar: where you are, plus the colour-scheme control. */
export default function Header() {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        display: { xs: "none", md: "flex" },
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: { sm: "100%", md: "1700px" },
        pt: 1.5,
      }}
    >
      <NavbarBreadcrumbs />
      <ColorModeIconDropdown />
    </Stack>
  );
}
