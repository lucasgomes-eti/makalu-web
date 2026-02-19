"use client";

import type {} from "@mui/x-date-pickers/themeAugmentation";
import type {} from "@mui/x-charts/themeAugmentation";
import type {} from "@mui/x-data-grid-pro/themeAugmentation";
import type {} from "@mui/x-tree-view/themeAugmentation";
import { alpha } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import CircularProgress from "@mui/material/CircularProgress";
import AppNavbar from "./components/AppNavbar";
import Header from "./components/Header";
import Orders from "./orders/page";
import Menu from "./menu/page";
import NewStore from "./stores/new/page";
import Analytics from "./analytics/page";
import SideMenu from "./components/SideMenu";
import AppTheme from "../shared-theme/AppTheme";
import { useAuthTokenStatus } from "@/hooks/useAuthTokenStatus";
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from "./theme/customizations";

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};

const menuPages: Record<string, React.ComponentType> = {
  "/dashboard/orders": Orders,
  "/dashboard/menu": Menu,
  "/dashboard/analytics": Analytics,
  "/dashboard/stores/new": NewStore,
};

function DashboardContent(props: {
  disableCustomTheme?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasToken, isLoading } = useAuthTokenStatus();

  useEffect(() => {
    if (!isLoading && !hasToken) {
      router.push("/sign-in");
    }
  }, [isLoading, hasToken, router]);

  if (isLoading || !hasToken) {
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

  const CurrentPage = menuPages[pathname] || Orders;

  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: "flex" }}>
        <SideMenu />
        <AppNavbar />
        {/* Main content */}
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: "auto",
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
            <CurrentPage />
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}

export default function DashboardRoot(props: {
  disableCustomTheme?: boolean;
  children: React.ReactNode;
}) {
  return <DashboardContent {...props} />;
}
