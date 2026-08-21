import Box from "@mui/material/Box";
import EmptyState from "@/shared/components/EmptyState";
import PageHeader from "@/shared/components/PageHeader";

/** Placeholder until the orders feature is built. */
export default function OrdersPage() {
  return (
    <Box sx={{ width: "100%" }}>
      <PageHeader title="Orders" description="Incoming orders for your stores." />
      <EmptyState message="Order management is not available yet." />
    </Box>
  );
}
