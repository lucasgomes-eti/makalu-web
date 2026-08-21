"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";
import StoreSwitcher from "@/features/stores/components/StoreSwitcher";
import MenuContent from "./MenuContent";
import OptionsMenu from "./OptionsMenu";
import UserCard from "./UserCard";

const DRAWER_WIDTH = 240;

const Drawer = styled(MuiDrawer)({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  boxSizing: "border-box",
  [`& .${drawerClasses.paper}`]: {
    width: DRAWER_WIDTH,
    boxSizing: "border-box",
    backgroundColor: "background.paper",
  },
});

/** Permanent desktop sidebar. Hidden below the `md` breakpoint (see `AppNavbar`). */
export default function SideMenu() {
  return (
    <Drawer variant="permanent" sx={{ display: { xs: "none", md: "block" } }}>
      <Box sx={{ display: "flex", p: 1.5 }}>
        <StoreSwitcher />
      </Box>
      <Divider />
      <Box
        sx={{
          overflow: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MenuContent />
      </Box>
      <Stack
        direction="row"
        sx={{ p: 2, gap: 1, borderTop: "1px solid", borderColor: "divider" }}
      >
        <UserCard action={<OptionsMenu />} />
      </Stack>
    </Drawer>
  );
}
