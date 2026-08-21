import * as React from "react";
import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import AppTheme from "@/shared/theme/AppTheme";

export const metadata: Metadata = {
  title: "Makalu",
  description: "Backoffice for the Makalu delivery platform.",
};

/**
 * Root layout. Mounts the single theme provider for the whole application —
 * `AppTheme` must not appear anywhere below this point.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Applies the stored colour scheme before first paint, avoiding a flash. */}
        <InitColorSchemeScript attribute="data-mui-color-scheme" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AppTheme>{children}</AppTheme>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
