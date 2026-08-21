"use client";

import Box from "@mui/material/Box";
import ErrorState from "@/shared/components/ErrorState";

/** Catches render errors anywhere in the tree, replacing a blank page. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
      <Box sx={{ maxWidth: 600, width: "100%" }}>
        <ErrorState
          title="Something went wrong"
          error={error.message || "An unexpected error occurred."}
          onRetry={reset}
        />
      </Box>
    </Box>
  );
}
