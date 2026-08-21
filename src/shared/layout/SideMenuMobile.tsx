"use client";

import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import MenuContent from "./MenuContent";
import UserCard from "./UserCard";

interface SideMenuMobileProps {
  open: boolean;
  onClose: () => void;
}

/** Navigation drawer for narrow viewports. */
export default function SideMenuMobile({ open, onClose }: SideMenuMobileProps) {
  const signOut = useSignOut();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        [`& .${drawerClasses.paper}`]: {
          backgroundImage: "none",
          backgroundColor: "background.paper",
        },
      }}
    >
      <Stack sx={{ maxWidth: "70dvw", width: 260, height: "100%" }}>
        <Stack sx={{ p: 2, pb: 1 }}>
          <UserCard />
        </Stack>
        <Divider />
        <Stack sx={{ flexGrow: 1 }}>
          <MenuContent onNavigate={onClose} />
        </Stack>
        <Divider />
        <Stack sx={{ p: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LogoutRoundedIcon />}
            onClick={signOut}
          >
            Logout
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
