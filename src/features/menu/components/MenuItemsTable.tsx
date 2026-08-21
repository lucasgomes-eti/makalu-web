"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format/currency";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { MenuItem } from "../model/menuItem.types";
import { useMenuItems } from "../hooks/useMenuItems";

/** The selected store's menu, with edit and delete actions per row. */
export default function MenuItemsTable() {
  const router = useRouter();
  const {
    items,
    isLoading,
    error,
    reload,
    removeItem,
    isRemoving,
    removeError,
    hasStore,
  } = useMenuItems();
  const [itemToDelete, setItemToDelete] = React.useState<MenuItem | null>(null);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const deleted = await removeItem(itemToDelete.id);
    if (deleted) setItemToDelete(null);
  };

  if (!hasStore) return <EmptyState message="Select a store to see its menu." />;
  if (isLoading) return <LoadingState label="Loading menu" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (items.length === 0) return <EmptyState message="No menu items yet." />;

  return (
    <>
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="Menu items">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => router.push(`/dashboard/menu/${item.id}`)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setItemToDelete(item)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={itemToDelete !== null}
        title="Delete menu item?"
        description={
          <>
            Are you sure you want to delete <strong>{itemToDelete?.name}</strong>?
            This action cannot be undone.
            {removeError && (
              <Box sx={{ mt: 2 }}>
                <ErrorState error={removeError} />
              </Box>
            )}
          </>
        }
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        destructive
        isPending={isRemoving}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </>
  );
}
