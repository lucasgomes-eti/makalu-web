"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Box,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import http from "@/components/http";
import eventBus from "@/functions/eventBus";

interface MenuItem {
  id: number;
  store_id: number;
  category: string;
  name: string;
  price: number;
  ingredients: string;
  configurations: Array<{
    name: string;
    type: string;
    options: string[];
  }>;
}

const SESSION_STORAGE_KEY = "selectedStoreId";

export default function MenuTable() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const storeId = sessionStorage.getItem(SESSION_STORAGE_KEY);

      if (!storeId) {
        setError("No store selected");
        setLoading(false);
        return;
      }

      const response = await http.get(`/stores/${storeId}/menu`);
      if (response.status === 200) {
        // Handle both single item and array responses
        const data = Array.isArray(response.data)
          ? response.data
          : [response.data];
        setMenuItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch menu items:", err);
      setError("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();

    const onStoreSelected = () => {
      fetchMenuItems();
    };

    eventBus.on("storeSelected", onStoreSelected);

    return () => {
      eventBus.off("storeSelected", onStoreSelected);
    };
  }, []);

  const handleEditItem = (menuItemId: number) => {
    router.push(`/dashboard/menu/${menuItemId}`);
  };

  const handleDeleteClick = (item: MenuItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setDeleting(true);
      const storeId = sessionStorage.getItem(SESSION_STORAGE_KEY);

      if (!storeId) {
        setError("No store selected");
        return;
      }

      const response = await http.delete(
        `/stores/${storeId}/menu/${itemToDelete.id}`,
      );

      if (response.status === 200 || response.status === 204) {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        fetchMenuItems();
      }
    } catch (err) {
      console.error("Failed to delete menu item:", err);
      setError("Failed to delete menu item");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (menuItems.length === 0) {
    return <Alert severity="info">No menu items found</Alert>;
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table
          sx={{ minWidth: 650, width: "100vh" }}
          aria-label="menu items table"
        >
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Name</strong>
              </TableCell>
              <TableCell>
                <strong>Category</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Price</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {menuItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell align="right">${item.price.toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleEditItem(item.id)}
                    title="Edit item"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(item)}
                    title="Delete item"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Delete Menu Item?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete{" "}
            <strong>{itemToDelete?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
