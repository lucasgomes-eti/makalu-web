"use client";

import MenuTable from "./MenuTable";
import { Fab, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useRouter } from "next/navigation";

export default function Menu() {
  const router = useRouter();

  const handleAddItem = () => {
    router.push("/dashboard/menu/new");
  };

  return (
    <Box sx={{ position: "relative" }}>
      <MenuTable />
      <Fab
        color="primary"
        aria-label="add menu item"
        onClick={handleAddItem}
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
