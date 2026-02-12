"use client";

import * as React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useAuthTokenStatus } from "@/hooks/useAuthTokenStatus";

export default function Home() {
  const router = useRouter();
  const { hasToken, isLoading } = useAuthTokenStatus();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (hasToken) {
      router.replace("/dashboard/orders");
    } else {
      router.replace("/sign-in");
    }
  }, [isLoading, hasToken, router]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}
