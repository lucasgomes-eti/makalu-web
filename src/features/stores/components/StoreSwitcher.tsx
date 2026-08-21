"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import MuiAvatar from "@mui/material/Avatar";
import MuiListItemAvatar from "@mui/material/ListItemAvatar";
import Select, { selectClasses } from "@mui/material/Select";
import { styled } from "@mui/material/styles";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import EditIcon from "@mui/icons-material/Edit";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useRouter } from "next/navigation";
import { imageUrl } from "@/lib/api/media";
import { useSelectedStore } from "../context/SelectedStoreProvider";

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: 28,
  height: 28,
  backgroundColor: (theme.vars || theme).palette.background.paper,
  color: (theme.vars || theme).palette.text.secondary,
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
}));

const ListItemAvatar = styled(MuiListItemAvatar)({
  minWidth: 0,
  marginRight: 12,
});

/**
 * Chooses which store the dashboard is scoped to, and links to store creation/editing.
 *
 * State comes from `SelectedStoreProvider`, so every screen that depends on the
 * selected store re-renders together — previously they each read `sessionStorage`
 * and reacted to a DOM event, which could leave them out of sync.
 */
export default function StoreSwitcher() {
  const router = useRouter();
  const { stores, selectedStoreId, selectStore, isLoading } = useSelectedStore();

  const handleEdit = (event: React.MouseEvent, storeId: number) => {
    // Without this the Select would also treat the click as a selection.
    event.stopPropagation();
    router.push(`/dashboard/stores/${storeId}`);
  };

  return (
    <Select
      id="store-switcher"
      value={selectedStoreId === null ? "" : String(selectedStoreId)}
      onChange={(event) => selectStore(Number(event.target.value))}
      displayEmpty
      disabled={isLoading}
      // Names the visible combobox itself; `slotProps.htmlInput` would only
      // label the hidden native input behind it.
      SelectDisplayProps={{ "aria-label": "Select store" }}
      fullWidth
      sx={{
        maxHeight: 56,
        width: 215,
        [`& .${selectClasses.select}`]: {
          display: "flex",
          alignItems: "center",
          gap: "2px",
          pl: 1,
        },
      }}
    >
      <MenuItem value="" disabled>
        {isLoading ? "Loading stores..." : "Select a store"}
      </MenuItem>

      <ListSubheader sx={{ pt: 0 }}>Stores</ListSubheader>

      {stores.map((store) => (
        <MenuItem
          key={store.id}
          value={String(store.id)}
          sx={{ display: "flex", justifyContent: "space-between", pr: 0.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
            <ListItemAvatar>
              <Avatar alt={store.name} src={imageUrl(store.logo_image_id)}>
                <StorefrontIcon sx={{ fontSize: "1rem" }} />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={store.name} />
          </Box>
          <IconButton
            size="small"
            aria-label={`Edit ${store.name}`}
            onClick={(event) => handleEdit(event, store.id)}
            sx={{ ml: "auto", width: 24, height: 24 }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </MenuItem>
      ))}

      <Divider sx={{ mx: -1 }} />

      <MenuItem onClick={() => router.push("/dashboard/stores/new")}>
        <ListItemIcon>
          <AddBusinessIcon />
        </ListItemIcon>
        <ListItemText primary="Add store" />
      </MenuItem>
    </Select>
  );
}
