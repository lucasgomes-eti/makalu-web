import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

interface LoadingStateProps {
  /** Fill the viewport instead of just the content slot. */
  fullPage?: boolean;
  label?: string;
}

/** Centred spinner — the single loading affordance across the app. */
export default function LoadingState({
  fullPage = false,
  label = "Loading",
}: LoadingStateProps) {
  return (
    <Box
      role="status"
      aria-label={label}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: fullPage ? "100vh" : undefined,
        py: fullPage ? 0 : 4,
      }}
    >
      <CircularProgress />
    </Box>
  );
}
