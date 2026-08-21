"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { env } from "@/lib/config/env";
import { geocodeAddress, reverseGeocode } from "@/lib/maps/geocode";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => void;
  error?: string;
}

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "400px",
  borderRadius: "8px",
};

/** Brasília — a neutral starting view when no location has been chosen yet. */
const DEFAULT_CENTER = { lat: -15.7942, lng: -47.8822 };

const SEARCH_ZOOM = 15;
const LIBRARIES: "places"[] = ["places"];

/**
 * Picks a store's coordinates by address search, map click, or marker drag.
 *
 * Coordinates are a controlled prop; the address text is local, since it is only a
 * means of finding a point and is never submitted.
 */
export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  error,
}: LocationPickerProps) {
  const [address, setAddress] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const mapRef = React.useRef<google.maps.Map | null>(null);

  const center = {
    lat: latitude ?? DEFAULT_CENTER.lat,
    lng: longitude ?? DEFAULT_CENTER.lng,
  };

  const handleSearch = React.useCallback(async () => {
    if (!address.trim()) return;

    setIsSearching(true);
    try {
      const result = await geocodeAddress(address);
      if (!result) return;

      onLocationChange(result.lat, result.lng);
      setAddress(result.formattedAddress);
      mapRef.current?.panTo({ lat: result.lat, lng: result.lng });
      mapRef.current?.setZoom(SEARCH_ZOOM);
    } finally {
      setIsSearching(false);
    }
  }, [address, onLocationChange]);

  /** Shared by map clicks and marker drags — both yield a new point to reverse-geocode. */
  const handlePointPicked = React.useCallback(
    async (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      onLocationChange(lat, lng);

      const formattedAddress = await reverseGeocode({ lat, lng });
      if (formattedAddress) setAddress(formattedAddress);
    },
    [onLocationChange],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleSearch();
  };

  if (!env.googleMapsApiKey) {
    return (
      <FormControl fullWidth error>
        <Typography color="error">
          Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to
          .env.local to pick a location on the map.
        </Typography>
      </FormControl>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={env.googleMapsApiKey}
      libraries={LIBRARIES}
      id="google-map-script"
    >
      <FormControl fullWidth error={Boolean(error)}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 2 }}>
          <TextField
            fullWidth
            label="Address"
            placeholder="Type the store address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={handleKeyDown}
            error={Boolean(error)}
            helperText={error ?? " "}
            disabled={isSearching}
            autoComplete="off"
          />
          <IconButton
            onClick={() => void handleSearch()}
            disabled={isSearching || !address.trim()}
            aria-label="Search address"
            sx={{ mt: 0.5 }}
          >
            {isSearching ? <CircularProgress size={24} /> : <SearchIcon />}
          </IconButton>
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Click the map to set the exact location
        </Typography>

        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={12}
          onLoad={(map) => {
            mapRef.current = map;
          }}
          onClick={handlePointPicked}
        >
          <Marker
            position={center}
            draggable
            onDragEnd={handlePointPicked}
            title="Store location"
          />
        </GoogleMap>

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <TextField
            label="Latitude"
            value={latitude?.toFixed(6) ?? ""}
            slotProps={{ input: { readOnly: true } }}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Longitude"
            value={longitude?.toFixed(6) ?? ""}
            slotProps={{ input: { readOnly: true } }}
            size="small"
            sx={{ flex: 1 }}
          />
        </Box>
      </FormControl>
    </LoadScript>
  );
}
