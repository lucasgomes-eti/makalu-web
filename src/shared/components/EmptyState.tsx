import Alert from "@mui/material/Alert";

interface EmptyStateProps {
  message: string;
}

/** Shown when a successful request returned nothing to display. */
export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <Alert severity="info" sx={{ width: "100%" }}>
      {message}
    </Alert>
  );
}
