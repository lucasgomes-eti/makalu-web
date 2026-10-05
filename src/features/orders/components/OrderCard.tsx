"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { formatCurrency } from "@/lib/format/currency";
import { Order } from "../model/order.types";
import { describeItemConfigurations, formatOrderTime } from "../model/orderBoard";

interface OrderCardProps {
  order: Order;
  /** Whether the order has anywhere to go; terminal orders are not draggable. */
  draggable: boolean;
  /** A move of this order is waiting for the API. */
  pending?: boolean;
  onDragStart: (order: Order) => void;
  onDragEnd: () => void;
}

/** One order on the board: what was ordered, where it goes, and what it costs. */
export default function OrderCard({
  order,
  draggable,
  pending = false,
  onDragStart,
  onDragEnd,
}: OrderCardProps) {
  const handleDragStart = (event: React.DragEvent) => {
    // Firefox will not start a drag unless some data is set.
    event.dataTransfer.setData("text/plain", String(order.id));
    event.dataTransfer.effectAllowed = "move";
    onDragStart(order);
  };

  return (
    <Card
      component="article"
      aria-label={`Order ${order.order_number}`}
      variant="outlined"
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={onDragEnd}
      aria-busy={pending}
      sx={{
        cursor: draggable ? "grab" : "default",
        flexShrink: 0,
        opacity: pending ? 0.6 : 1,
        transition: "opacity 120ms",
      }}
    >
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle2" component="h3">
            #{order.order_number}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {formatOrderTime(order.created_at)}
          </Typography>
        </Stack>

        <Stack component="ul" spacing={0.75} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {order.items.map((item) => {
            const configurations = describeItemConfigurations(item);
            return (
              <Box component="li" key={item.id}>
                <Typography variant="body2">{item.name}</Typography>
                {configurations.map((configuration) => (
                  <Typography
                    key={configuration.id}
                    variant="caption"
                    sx={{ display: "block", color: "text.secondary" }}
                  >
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {configuration.name}:
                    </Box>{" "}
                    {configuration.options}
                  </Typography>
                ))}
                {item.notes && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", fontStyle: "italic", color: "warning.main" }}
                  >
                    “{item.notes}”
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" spacing={0.5} sx={{ alignItems: "flex-start", mb: 0.5 }}>
          <PlaceOutlinedIcon sx={{ fontSize: 16, mt: "2px", color: "text.secondary" }} />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {order.delivery_address_line}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Delivery {formatCurrency(order.total.delivery_fee)}
          </Typography>
          <Typography variant="subtitle2">{formatCurrency(order.total.total)}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
