"use client";

import * as React from "react";
import Menu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import ListItemIcon, { listItemIconClasses } from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { listClasses } from "@mui/material/List";
import { paperClasses } from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import MenuButton from "./MenuButton";

const MenuItem = styled(MuiMenuItem)({ margin: "2px 0" });

/** Account actions for the desktop sidebar. */
export default function OptionsMenu() {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const signOut = useSignOut();
  const close = () => setAnchorEl(null);

  return (
    <React.Fragment>
      <MenuButton
        aria-label="Open account menu"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ borderColor: "transparent" }}
      >
        <MoreVertRoundedIcon />
      </MenuButton>
      <Menu
        id="account-options-menu"
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={close}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        sx={{
          [`& .${listClasses.root}`]: { padding: "4px" },
          [`& .${paperClasses.root}`]: { padding: 0 },
        }}
      >
        <MenuItem
          onClick={() => {
            close();
            signOut();
          }}
          sx={{
            [`& .${listItemIconClasses.root}`]: { ml: "auto", minWidth: 0 },
          }}
        >
          <ListItemText>Logout</ListItemText>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
        </MenuItem>
      </Menu>
    </React.Fragment>
  );
}
