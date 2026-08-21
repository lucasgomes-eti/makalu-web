/**
 * Promise wrappers around the Google Maps Geocoder.
 *
 * The callback form was inlined three times across the store screens, each with
 * slightly different null-checking. These wrappers resolve to `null` instead of
 * throwing on "no result", because an unresolvable address is a normal outcome.
 *
 * Both require the Maps JS API to be loaded — call them only from inside a
 * `<LoadScript>` subtree.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends Coordinates {
  formattedAddress: string;
}

function isGeocoderAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.google?.maps?.Geocoder === "function"
  );
}

function geocode(
  request: google.maps.GeocoderRequest,
): Promise<google.maps.GeocoderResult | null> {
  if (!isGeocoderAvailable()) return Promise.resolve(null);

  return new Promise((resolve) => {
    new google.maps.Geocoder().geocode(request, (results, status) => {
      resolve(status === "OK" && results?.[0] ? results[0] : null);
    });
  });
}

/** Address text → coordinates. */
export async function geocodeAddress(
  address: string,
  countryCode = "br",
): Promise<GeocodeResult | null> {
  const result = await geocode({
    address,
    componentRestrictions: { country: countryCode },
  });
  if (!result) return null;

  return {
    lat: result.geometry.location.lat(),
    lng: result.geometry.location.lng(),
    formattedAddress: result.formatted_address,
  };
}

/** Coordinates → address text. */
export async function reverseGeocode(
  location: Coordinates,
): Promise<string | null> {
  const result = await geocode({ location });
  return result?.formatted_address ?? null;
}
