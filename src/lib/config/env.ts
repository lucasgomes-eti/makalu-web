/**
 * Single source of truth for public runtime configuration.
 *
 * `process.env.NEXT_PUBLIC_*` is inlined at build time by Next, so these must be
 * referenced as full static property accesses — never `process.env[key]`.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local — see README.md.`,
    );
  }
  return value;
}

export const env = {
  /** Base URL of the Makalu REST API. */
  apiBaseUrl: required(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "NEXT_PUBLIC_API_BASE_URL",
  ),
  /**
   * Browser-side Google Maps key. Public by design; restrict it by HTTP referrer
   * in the Google Cloud console. Optional so the app still boots without maps.
   */
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
} as const;
