"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Order, ORDER_STATUS_LABELS, OrderStatus } from "../model/order.types";
import OrderCard from "./OrderCard";

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "warning.main",
  ACCEPTED: "info.main",
  IN_ROUTE: "primary.main",
  FINISHED: "success.main",
  CANCELLED: "error.main",
};

interface OrderColumnProps {
  status: OrderStatus;
  orders: Order[];
  /** A card is being dragged and may be dropped here. */
  acceptsDrop: boolean;
  canDrag: (order: Order) => boolean;
  onCardDragStart: (order: Order) => void;
  onCardDragEnd: () => void;
  onDrop: (status: OrderStatus) => void;
}

/** One status lane of the board. */
export default function OrderColumn({
  status,
  orders,
  acceptsDrop,
  canDrag,
  onCardDragStart,
  onCardDragEnd,
  onDrop,
}: OrderColumnProps) {
  const [isOver, setIsOver] = React.useState(false);
  const headingId = `order-column-${status}`;

  const handleDragOver = (event: React.DragEvent) => {
    if (!acceptsDrop) return;
    // Cancelling dragover is what marks this element as a valid drop target.
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsOver(false);
    if (acceptsDrop) onDrop(status);
  };

  return (
    <Paper
      component="section"
      aria-labelledby={headingId}
      variant="outlined"
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        // dragleave also fires when the pointer moves onto a card inside the column.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOver(false);
        }
      }}
      onDrop={handleDrop}
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: "1 0 260px",
        maxWidth: 360,
        p: 1,
        gap: 1,
        bgcolor: "background.default",
        borderStyle: acceptsDrop ? "dashed" : "solid",
        borderColor: isOver && acceptsDrop ? STATUS_COLORS[status] : undefined,
        transition: "border-color 120ms",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 0.5 }}>
        <Box
          sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_COLORS[status] }}
        />
        <Typography id={headingId} variant="subtitle2" component="h2" sx={{ flexGrow: 1 }}>
          {ORDER_STATUS_LABELS[status]}
        </Typography>
        <Chip size="small" label={orders.length} aria-label={`${orders.length} orders`} />
      </Stack>

      <Stack spacing={1} sx={{ flexGrow: 1, minHeight: 120 }}>
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            draggable={canDrag(order)}
            onDragStart={onCardDragStart}
            onDragEnd={onCardDragEnd}
          />
        ))}
      </Stack>
    </Paper>
  );
}
