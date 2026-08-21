import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import { ApiError, formatApiError } from "@/lib/api/apiError";

interface ErrorStateProps {
  error: ApiError | string;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/** Renders a failure, optionally with a retry affordance. */
export default function ErrorState({
  error,
  title,
  onRetry,
  onDismiss,
}: ErrorStateProps) {
  const message = typeof error === "string" ? error : formatApiError(error);

  return (
    <Alert
      severity="error"
      sx={{ width: "100%" }}
      onClose={onDismiss}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  );
}
