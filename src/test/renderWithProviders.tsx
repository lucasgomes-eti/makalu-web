import { ReactElement, ReactNode } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import AppTheme from "@/shared/theme/AppTheme";

function Providers({ children }: { children: ReactNode }) {
  return <AppTheme>{children}</AppTheme>;
}

/**
 * Renders a component inside the app's theme.
 *
 * MUI components read the theme, so a bare `render` produces different markup from
 * the real app (and warns). Use this everywhere instead of RTL's `render`.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return render(ui, { wrapper: Providers, ...options });
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
