"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import PageHeader from "@/shared/components/PageHeader";
import { Order, ORDER_STATUSES, OrderStatus } from "../model/order.types";
import { canMoveOrder } from "../model/orderBoard";
import { useOrderBoard } from "../hooks/useOrderBoard";
import OrderColumn from "./OrderColumn";

/** The selected store's orders as a kanban board, one column per status. */
export default function OrdersBoard() {
  const {
    columns,
    hasData,
    isEmpty,
    moveOrder,
    isLoading,
    isRefreshing,
    error,
    refresh,
    hasStore,
  } = useOrderBoard();
  const [draggedOrder, setDraggedOrder] = React.useState<Order | null>(null);

  const handleDrop = (status: OrderStatus) => {
    if (draggedOrder) moveOrder(draggedOrder, status);
    setDraggedOrder(null);
  };

  const hasAnyMove = (order: Order) =>
    ORDER_STATUSES.some((status) => canMoveOrder(order.status, status));

  return (
    <Box sx={{ width: "100%" }}>
      <PageHeader
        title="Orders"
        description="Drag an order to move it through its lifecycle."
        action={
          hasStore && (
            <Button
              variant="outlined"
              size="small"
              onClick={refresh}
              disabled={isLoading || isRefreshing}
              startIcon={
                isRefreshing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <RefreshRoundedIcon />
                )
              }
            >
              Refresh
            </Button>
          )
        }
      />

      {!hasStore ? (
        <EmptyState message="Select a store to see its orders." />
      ) : isLoading ? (
        <LoadingState label="Loading orders" />
      ) : (
        <Stack spacing={2}>
          {error && <ErrorState error={error} onRetry={refresh} />}
          {isEmpty && <EmptyState message="No orders yet." />}
          {hasData && (
            <Box
              sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1, alignItems: "stretch" }}
            >
              {ORDER_STATUSES.map((status) => (
                <OrderColumn
                  key={status}
                  status={status}
                  orders={columns[status]}
                  acceptsDrop={
                    draggedOrder !== null && canMoveOrder(draggedOrder.status, status)
                  }
                  canDrag={hasAnyMove}
                  onCardDragStart={setDraggedOrder}
                  onCardDragEnd={() => setDraggedOrder(null)}
                  onDrop={handleDrop}
                />
              ))}
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}
