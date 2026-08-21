import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeAddress, reverseGeocode } from "./geocode";

type GeocodeCallback = (results: unknown[] | null, status: string) => void;

/** Installs a fake `google.maps.Geocoder` that replies with `results`/`status`. */
function stubGeocoder(results: unknown[] | null, status = "OK") {
  const geocode = vi.fn((_request: unknown, callback: GeocodeCallback) =>
    callback(results, status),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).google = {
    maps: { Geocoder: class { geocode = geocode } },
  };

  return geocode;
}

function result(lat: number, lng: number, address: string) {
  return {
    formatted_address: address,
    geometry: { location: { lat: () => lat, lng: () => lng } },
  };
}

describe("geocode helpers", () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).google;
  });

  it("resolves an address to coordinates", async () => {
    stubGeocoder([result(-15.79, -47.88, "Brasília, Brazil")]);

    await expect(geocodeAddress("Brasilia")).resolves.toEqual({
      lat: -15.79,
      lng: -47.88,
      formattedAddress: "Brasília, Brazil",
    });
  });

  it("restricts the search to a country", async () => {
    const geocode = stubGeocoder([result(0, 0, "Somewhere")]);

    await geocodeAddress("Rua X", "br");

    expect(geocode).toHaveBeenCalledWith(
      { address: "Rua X", componentRestrictions: { country: "br" } },
      expect.any(Function),
    );
  });

  it("treats 'no result' as null rather than an error", async () => {
    stubGeocoder([], "ZERO_RESULTS");

    await expect(geocodeAddress("nowhere")).resolves.toBeNull();
    await expect(reverseGeocode({ lat: 0, lng: 0 })).resolves.toBeNull();
  });

  it("resolves coordinates to an address", async () => {
    stubGeocoder([result(-15.79, -47.88, "Brasília, Brazil")]);

    await expect(reverseGeocode({ lat: -15.79, lng: -47.88 })).resolves.toBe(
      "Brasília, Brazil",
    );
  });

  it("returns null instead of throwing when Maps has not loaded", async () => {
    // Previously this path called `new window.google.maps.Geocoder()` behind a
    // one-second timer and threw whenever the SDK was slower than that.
    await expect(reverseGeocode({ lat: 1, lng: 1 })).resolves.toBeNull();
    await expect(geocodeAddress("anywhere")).resolves.toBeNull();
  });
});
