"use client";

import * as React from "react";
import type {} from "@mui/x-date-pickers/themeAugmentation";
import type {} from "@mui/x-charts/themeAugmentation";
import type {} from "@mui/x-data-grid-pro/themeAugmentation";
import type {} from "@mui/x-tree-view/themeAugmentation";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { inputsCustomizations } from "./customizations/inputs";
import { dataDisplayCustomizations } from "./customizations/dataDisplay";
import { feedbackCustomizations } from "./customizations/feedback";
import { navigationCustomizations } from "./customizations/navigation";
import { surfacesCustomizations } from "./customizations/surfaces";
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from "./x-customizations";
import { colorSchemes, typography, shadows, shape } from "./themePrimitives";

/**
 * The application theme. Built once at module load — it has no props to depend on,
 * so re-creating it per render would only churn Emotion's cache.
 *
 * MUI X component overrides are included here rather than injected by the dashboard
 * layout: one theme, one place, applied uniformly to every route.
 */
const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-mui-color-scheme",
    cssVarPrefix: "template",
  },
  colorSchemes,
  typography,
  shadows,
  shape,
  components: {
    ...inputsCustomizations,
    ...dataDisplayCustomizations,
    ...feedbackCustomizations,
    ...navigationCustomizations,
    ...surfacesCustomizations,
    ...chartsCustomizations,
    ...dataGridCustomizations,
    ...datePickersCustomizations,
    ...treeViewCustomizations,
  },
});

export { theme };

/**
 * Mounts the theme exactly once, at the root of the tree. Nesting a second
 * `AppTheme` anywhere below is a bug — the previous code did that and paid for two
 * `createTheme` calls plus two conflicting token sets.
 */
export default function AppTheme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme} disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
