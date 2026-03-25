"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import SearchIcon from "@mui/icons-material/Search";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

interface LocationPickerProps {
  onLocationChange: (latitude: number, longitude: number) => void;
  address: string;
  onAddressChange: (address: string) => void;
  error?: string | null;
  initialLatitude?: number;
  initialLongitude?: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "8px",
};

const defaultCenter = {
  lat: -15.7942,
  lng: -47.8822,
};

export default function LocationPicker({
  onLocationChange,
  address,
  onAddressChange,
  error,
  initialLatitude,
  initialLongitude,
}: LocationPickerProps) {
  const [latitude, setLatitude] = React.useState<number>(
    initialLatitude ?? defaultCenter.lat,
  );
  const [longitude, setLongitude] = React.useState<number>(
    initialLongitude ?? defaultCenter.lng,
  );
  const [inputValue, setInputValue] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [scriptLoaded, setScriptLoaded] = React.useState(false);

  const handleSearchAddress = React.useCallback(() => {
    if (!inputValue.trim()) return;

    setIsSearching(true);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { address: inputValue, componentRestrictions: { country: "br" } },
      (
        results: google.maps.GeocoderResult[] | null,
        status: google.maps.GeocoderStatus,
      ) => {
        if (
          status === "OK" &&
          results &&
          results[0] &&
          results[0].geometry.location
        ) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();

          setLatitude(lat);
          setLongitude(lng);
          onLocationChange(lat, lng);
          onAddressChange(results[0].formatted_address);

          // Move map to selected location
          if (mapRef.current) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(15);
          }
        }
        setIsSearching(false);
      },
    );
  }, [inputValue, onLocationChange, onAddressChange]);

  const handleKeyPress = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSearchAddress();
      }
    },
    [handleSearchAddress],
  );

  const handleMapClick = React.useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        setLatitude(lat);
        setLongitude(lng);
        onLocationChange(lat, lng);

        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat, lng } },
          (
            results: google.maps.GeocoderResult[] | null,
            status: google.maps.GeocoderStatus,
          ) => {
            if (status === "OK" && results && results[0]) {
              const formattedAddress = results[0].formatted_address;
              setInputValue(formattedAddress);
              onAddressChange(formattedAddress);
            }
          },
        );
      }
    },
    [onLocationChange, onAddressChange],
  );

  const handleMapLoad = React.useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Suppress the "Google Maps API is already loaded" error
  React.useEffect(() => {
    const script = document.querySelector(
      'script[src*="maps.googleapis.com"]',
    ) as HTMLScriptElement | null;
    if (script) {
      script.onerror = null;
    }
  }, []);

  if (!apiKey) {
    return (
      <FormControl fullWidth error>
        <Typography color="error">
          Google Maps API key não está configurada. Por favor, adicione
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ao arquivo .env.
        </Typography>
      </FormControl>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={["places"]}
      onLoad={() => setScriptLoaded(true)}
      onError={() => {
        setScriptLoaded(true);
        console.warn(
          "Google Maps script already loaded or error loading script.",
        );
      }}
      id="google-map-script"
    >
      <FormControl fullWidth error={!!error}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              fullWidth
              label="Endereço"
              placeholder="Digite o endereço da loja"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyPress={handleKeyPress}
              error={!!error}
              helperText={error ?? " "}
              disabled={isSearching}
              autoComplete="off"
            />
            <IconButton
              onClick={handleSearchAddress}
              disabled={isSearching || !inputValue.trim()}
              sx={{ mt: 0.5 }}
            >
              {isSearching ? <CircularProgress size={24} /> : <SearchIcon />}
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ position: "relative", mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Clique no mapa para selecionar a localização exata
          </Typography>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={{ lat: latitude, lng: longitude }}
            zoom={12}
            onLoad={handleMapLoad}
            onClick={handleMapClick}
          >
            <Marker
              position={{ lat: latitude, lng: longitude }}
              draggable={true}
              onDragEnd={(event) => {
                if (event.latLng) {
                  const lat = event.latLng.lat();
                  const lng = event.latLng.lng();

                  setLatitude(lat);
                  setLongitude(lng);
                  onLocationChange(lat, lng);

                  // Reverse geocode to get address
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode(
                    { location: { lat, lng } },
                    (
                      results: google.maps.GeocoderResult[] | null,
                      status: google.maps.GeocoderStatus,
                    ) => {
                      if (status === "OK" && results && results[0]) {
                        const formattedAddress = results[0].formatted_address;
                        setInputValue(formattedAddress);
                        onAddressChange(formattedAddress);
                      }
                    },
                  );
                }
              }}
              title="Localização da loja"
            />
          </GoogleMap>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Latitude"
            value={latitude.toFixed(6)}
            disabled
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Longitude"
            value={longitude.toFixed(6)}
            disabled
            size="small"
            sx={{ flex: 1 }}
          />
        </Box>
      </FormControl>
    </LoadScript>
  );
}
