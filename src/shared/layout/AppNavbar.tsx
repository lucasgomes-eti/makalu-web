"use client";

import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import MuiToolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ColorModeIconDropdown from "@/shared/theme/ColorModeIconDropdown";
import MenuButton from "./MenuButton";
import SideMenuMobile from "./SideMenuMobile";

const Toolbar = styled(MuiToolbar)({
  width: "100%",
  padding: "12px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexShrink: 0,
});

/** Mobile top bar. Hidden from the `md` breakpoint up (see `SideMenu`). */
export default function AppNavbar() {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  return (
    <AppBar
      position="fixed"
      sx={{
        display: { xs: "block", md: "none" },
        boxShadow: 0,
        bgcolor: "background.paper",
        backgroundImage: "none",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar variant="regular">
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mr: "auto" }}>
          <BrandMark />
          <Typography variant="h6" component="p" sx={{ color: "text.primary" }}>
            Makalu
          </Typography>
        </Stack>
        <ColorModeIconDropdown />
        <MenuButton
          aria-label="Open navigation menu"
          onClick={() => setIsDrawerOpen(true)}
        >
          <MenuRoundedIcon />
        </MenuButton>
        <SideMenuMobile
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      </Toolbar>
    </AppBar>
  );
}

function BrandMark() {
  return (
    <Box
      sx={{
        width: "1.5rem",
        height: "1.5rem",
        borderRadius: "999px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage:
          "linear-gradient(135deg, hsl(210, 98%, 60%) 0%, hsl(210, 100%, 35%) 100%)",
        color: "hsla(210, 100%, 95%, 0.9)",
        border: "1px solid",
        borderColor: "hsl(210, 100%, 55%)",
      }}
    >
      <DashboardRoundedIcon color="inherit" sx={{ fontSize: "1rem" }} />
    </Box>
  );
}
