"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export default function NotFound() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 4,
      }}
    >
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="h4" component="h1">
          Page not found
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          The page you are looking for does not exist.
        </Typography>
        <Button component={Link} href="/dashboard/orders" variant="contained">
          Back to the dashboard
        </Button>
      </Stack>
    </Box>
  );
}
