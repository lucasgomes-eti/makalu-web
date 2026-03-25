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
import { useAuthTokenStatus } from "@/hooks/useAuthTokenStatus";
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from "./theme/customizations";
import AppNavbar from "./components/AppNavbar";
import Header from "./components/Header";
import Orders from "./orders/page";
import Menu from "./menu/page";
import Analytics from "./analytics/page";
import SideMenu from "./components/SideMenu";
import AppTheme from "../shared-theme/AppTheme";
import StoreDetail from "./stores/components/StoreDetail";
import NewMenuItem from "./menu/new/page";
import EditMenuItem from "./menu/[menuItemId]/page";

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
  "/dashboard/menu/new": NewMenuItem,
  "/dashboard/menu/[menuItemId]": EditMenuItem,
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

  // Don't render CurrentPage for store routes - they have their own page.tsx
  const shouldRenderMenuPage =
    !pathname.startsWith("/dashboard/stores/") &&
    pathname.startsWith("/dashboard");

  // Helper function to match dynamic routes
  const getMatchingPage = () => {
    if (!shouldRenderMenuPage) return null;
    
    // First try exact match
    if (menuPages[pathname]) {
      return menuPages[pathname];
    }
    
    // Check for dynamic menu item route: /dashboard/menu/:id (but not /dashboard/menu/new)
    const menuItemMatch = pathname.match(/^\/dashboard\/menu\/(\d+)$/);
    if (menuItemMatch && pathname !== "/dashboard/menu/new") {
      return EditMenuItem;
    }
    
    // Default fallback
    return Orders;
  };

  const CurrentPage = getMatchingPage();

  // Check if it's a store route and extract storeId if it's an edit route
  const isStoreRoute = pathname.startsWith("/dashboard/stores/");
  const isNewStoreRoute = pathname === "/dashboard/stores/new";
  const storeIdMatch = pathname.match(/^\/dashboard\/stores\/(\d+)$/);
  const storeId = storeIdMatch ? storeIdMatch[1] : null;

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
            {isStoreRoute ? (
              <StoreDetail storeId={storeId || undefined} />
            ) : CurrentPage ? (
              <CurrentPage />
            ) : null}
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
