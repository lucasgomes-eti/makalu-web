"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import AuthGuard from "@/features/auth/components/AuthGuard";
import { SelectedStoreProvider } from "@/features/stores/context/SelectedStoreProvider";
import AppNavbar from "@/shared/layout/AppNavbar";
import Header from "@/shared/layout/Header";
import SideMenu from "@/shared/layout/SideMenu";

/**
 * Dashboard shell: authentication gate, selected-store context, and chrome.
 *
 * It renders `{children}`, so every route under `/dashboard` is an ordinary
 * `page.tsx`. The previous version kept a hand-maintained `pathname → Component`
 * map and threw `children` away, which made each new route a layout edit.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SelectedStoreProvider>
        <Box sx={{ display: "flex" }}>
          <SideMenu />
          <AppNavbar />
          <Box
            component="main"
            sx={(theme) => ({
              flexGrow: 1,
              backgroundColor: theme.vars
                ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
                : alpha(theme.palette.background.default, 1),
              overflow: "auto",
              minHeight: "100vh",
            })}
          >
            <Stack
              spacing={2}
              sx={{
                alignItems: "center",
                mx: 3,
                pb: 5,
                mt: { xs: 8, md: 0 },
              }}
            >
              <Header />
              {children}
            </Stack>
          </Box>
        </Box>
      </SelectedStoreProvider>
    </AuthGuard>
  );
}
