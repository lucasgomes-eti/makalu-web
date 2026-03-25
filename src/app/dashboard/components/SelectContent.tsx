import * as React from "react";
import MuiAvatar from "@mui/material/Avatar";
import MuiListItemAvatar from "@mui/material/ListItemAvatar";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListSubheader from "@mui/material/ListSubheader";
import Select, { SelectChangeEvent, selectClasses } from "@mui/material/Select";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import StorefrontIcon from "@mui/icons-material/Storefront";
import EditIcon from "@mui/icons-material/Edit";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import http from "@/components/http";
import eventBus from "@/functions/eventBus";

interface Store {
  id: number;
  name: string;
  categories: any[];
  logo_image_id: number | null;
  cover_image_id: number | null;
}

const SESSION_STORAGE_KEY = "selectedStoreId";

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

const StoreMenuItemContent = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  justifyContent: "space-between",
});

export default function SelectContent() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [store, setStore] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    try {
      const response = await http.get("/stores/owned");
      if (response.status === 200) {
        setStores(response.data);

        // Determine default store
        const savedStoreId = sessionStorage.getItem(SESSION_STORAGE_KEY);
        let defaultStore = "";

        if (
          savedStoreId &&
          response.data.some((s: Store) => s.id.toString() === savedStoreId)
        ) {
          // Use saved store if it exists in the list
          defaultStore = savedStoreId;
        } else if (response.data.length > 0) {
          // Use first store if no saved store or saved store not found
          defaultStore = response.data[0].id.toString();
        }

        if (defaultStore) {
          setStore(defaultStore);
          sessionStorage.setItem(SESSION_STORAGE_KEY, defaultStore);
        }
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    const onStoreCreated = () => {
      fetchStores();
    };

    const onStoreUpdated = () => {
      fetchStores();
    };

    eventBus.on("storeCreated", onStoreCreated);
    eventBus.on("storeUpdated", onStoreUpdated);

    return () => {
      eventBus.off("storeCreated", onStoreCreated);
      eventBus.off("storeUpdated", onStoreUpdated);
    };
  }, []);

  const handleChange = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value as string;
    setStore(selectedValue);

    if (selectedValue) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, selectedValue);
      eventBus.emit("storeSelected", parseInt(selectedValue));
      console.log("Selected store ID:", selectedValue);
    }
  };

  const handleEditStore = (e: React.MouseEvent, storeId: number) => {
    e.stopPropagation();
    router.push(`/dashboard/stores/${storeId}`);
  };

  return (
    <Select
      labelId="store-select"
      id="store-simple-select"
      value={store}
      onChange={handleChange}
      displayEmpty
      inputProps={{ "aria-label": "Select store" }}
      fullWidth
      sx={{
        maxHeight: 56,
        width: 215,
        "&.MuiList-root": {
          p: "8px",
        },
        [`& .${selectClasses.select}`]: {
          display: "flex",
          alignItems: "center",
          gap: "2px",
          pl: 1,
        },
      }}
    >
      <MenuItem value="" disabled>
        Select a store
      </MenuItem>
      <ListSubheader sx={{ pt: 0 }}>Stores</ListSubheader>
      {stores.map((storeItem) => (
        <MenuItem
          key={storeItem.id}
          value={storeItem.id.toString()}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pr: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
            <ListItemAvatar>
              <Avatar alt={storeItem.name}>
                {storeItem.logo_image_id ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/stores/logo-image/${storeItem.logo_image_id}`}
                    alt={storeItem.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <StorefrontIcon sx={{ fontSize: "1rem" }} />
                )}
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={storeItem.name} />
          </Box>
          <IconButton
            size="small"
            onClick={(e) => handleEditStore(e, storeItem.id)}
            sx={{
              visibility: "visible",
              ml: "auto",
              width: 24,
              height: 24,
            }}
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
