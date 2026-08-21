import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Resolves the `@/*` alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    server: {
      deps: {
        // MUI X ships an ESM entry that imports a .css file; Vite must process
        // these packages rather than externalise them to Node's ESM loader.
        inline: [/@mui\/x-/],
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/features/**", "src/lib/**", "src/shared/**"],
      // Vendored template widgets and pure style objects carry no logic to cover.
      exclude: ["src/features/analytics/**", "src/shared/theme/**"],
      // Floor, not a target. Raise it when coverage rises; never lower it to
      // make a red run go green.
      thresholds: { statements: 78, branches: 72, functions: 78, lines: 78 },
    },
  },
});
