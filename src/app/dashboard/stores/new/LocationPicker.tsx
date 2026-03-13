"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";

interface LocationPickerProps {
  onLocationChange: (latitude: number, longitude: number) => void;
  address: string;
  onAddressChange: (address: string) => void;
  error?: string | null;
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
}: LocationPickerProps) {
  const [latitude, setLatitude] = React.useState<number>(defaultCenter.lat);
  const [longitude, setLongitude] = React.useState<number>(defaultCenter.lng);
  const [isLoading, setIsLoading] = React.useState(false);
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(
    null,
  );
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handlePlaceSelected = React.useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (place && place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        setLatitude(lat);
        setLongitude(lng);
        onLocationChange(lat, lng);
        onAddressChange(place.formatted_address || "");

        // Move map to selected location
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
      }
    }
  }, [onLocationChange, onAddressChange]);

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
          (results: google.maps.GeocoderResult[], status: string) => {
            if (status === "OK" && results[0]) {
              onAddressChange(results[0].formatted_address);
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
    <LoadScript googleMapsApiKey={apiKey} libraries={["places"]}>
      <FormControl fullWidth error={!!error}>
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRef.current = autocomplete;
            }}
            onPlaceChanged={handlePlaceSelected}
            options={{
              types: ["address"],
              componentRestrictions: { country: "br" },
            }}
          >
            <TextField
              fullWidth
              label="Endereço"
              placeholder="Digite o endereço da loja"
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              error={!!error}
              helperText={error ?? " "}
              disabled={isLoading}
              autoComplete="off"
            />
          </Autocomplete>
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
                    (results: google.maps.GeocoderResult[], status: string) => {
                      if (status === "OK" && results[0]) {
                        onAddressChange(results[0].formatted_address);
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
