"use client";

import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import Link from "next/link";
import MenuItemsTable from "@/features/menu/components/MenuItemsTable";
import PageHeader from "@/shared/components/PageHeader";

export default function MenuPage() {
  return (
    <Box sx={{ width: "100%" }}>
      <PageHeader
        title="Menu"
        description="Dishes available in the selected store."
      />
      <MenuItemsTable />
      <Fab
        color="primary"
        aria-label="Add menu item"
        component={Link}
        href="/dashboard/menu/new"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
