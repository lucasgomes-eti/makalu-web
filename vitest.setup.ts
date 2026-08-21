import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `env` throws if NEXT_PUBLIC_API_BASE_URL is missing, and Next only inlines it
// during a real build — so tests provide it here.
process.env.NEXT_PUBLIC_API_BASE_URL ??= "http://api.test";
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??= "test-maps-key";

// jsdom refuses to navigate and logs a "Not implemented" stack for every attempt.
// Replacing `location` with a stub keeps output readable and lets tests assert on
// redirects (e.g. the sign-out that follows a failed token refresh).
const locationStub = {
  ...window.location,
  assign: vi.fn(),
  replace: vi.fn(),
};
Object.defineProperty(window, "location", {
  configurable: true,
  writable: true,
  value: locationStub,
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});
