"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormGroup from "@mui/material/FormGroup";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import http from "@/components/http";
import { useState, useEffect } from "react";
import UploadLogoImage from "../new/UploadLogoImage";
import UploadCoverImage from "../new/UploadCoverImage";
import LocationPicker from "../new/LocationPicker";
import eventBus from "@/functions/eventBus";

interface Category {
  id: number;
  description: string;
}

interface Store {
  id: number;
  name: string;
  categories_ids: number[];
  latitude: number;
  longitude: number;
  logo_image_id: number | null;
  cover_image_id: number | null;
}

interface StoreDetailProps {
  storeId?: string;
}

export default function StoreDetail({ storeId }: StoreDetailProps) {
  const router = useRouter();
  const isEdit = !!storeId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [storeName, setStoreName] = useState("");
  const [storeNameError, setStoreNameError] = useState<string | null>(null);

  const [categoriesIds, setCategoriesIds] = useState<number[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [logoId, setLogoId] = useState<number | null>(null);
  const [coverId, setCoverId] = useState<number | null>(null);

  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [deliveryFee, setDeliveryFee] = useState<number | string>("");
  const [deliveryFeeError, setDeliveryFeeError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch store data (only in edit mode)
  React.useEffect(() => {
    if (!isEdit) return;

    const fetchStore = async () => {
      try {
        const response = await http.get(`/stores/${storeId}`);
        if (response.status === 200) {
          const storeData = response.data;
          setStoreName(storeData.name);
          setCategoriesIds(
            storeData.categories.map((cat: Category) => cat.id) || [],
          );
          setLatitude(storeData.latitude);
          setLongitude(storeData.longitude);
          setAddress(""); // Will be fetched via reverse geocoding
          setLogoId(storeData.logo_image_id);
          setCoverId(storeData.cover_image_id);
          setDeliveryFee(storeData.delivery_fee ?? "");
        }
      } catch (error) {
        console.error("Failed to fetch store:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [storeId, isEdit]);

  // Reverse geocode to get initial address when store data is loaded
  React.useEffect(() => {
    if (latitude && longitude && !address) {
      // Use timeout to ensure Google Maps is loaded
      const timeout = setTimeout(() => {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results: any[], status: string) => {
            if (status === "OK" && results[0]) {
              setAddress(results[0].formatted_address);
            }
          },
        );
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [latitude, longitude, address]);

  // Fetch categories
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await http.get("/categories");
        if (response.status === 200) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Clear previous errors
    setStoreNameError(null);
    setCategoriesError(null);
    setUploadError(null);
    setLocationError(null);
    setDeliveryFeeError(null);

    // Validate location
    if (latitude === null || longitude === null) {
      setLocationError("Por favor, selecione uma localização no mapa");
      setIsSubmitting(false);
      return;
    }

    // Validate delivery fee
    if (!deliveryFee || parseFloat(String(deliveryFee)) <= 0) {
      setDeliveryFeeError("Delivery fee must be greater than 0");
      setIsSubmitting(false);
      return;
    }

    try {
      const storeData = {
        name: storeName,
        categories_ids: categoriesIds,
        latitude,
        longitude,
        logo_image_id: logoId,
        cover_image_id: coverId,
        delivery_fee: parseFloat(String(deliveryFee)),
      };

      let response;
      if (isEdit) {
        response = await http.put(`/stores/${storeId}`, storeData);
      } else {
        response = await http.post("/stores", storeData);
      }

      if (
        (isEdit && response.status === 204) ||
        (!isEdit && response.status === 201)
      ) {
        const currentStoreId = isEdit ? storeId : response.data.id;

        // Upload logo image if selected
        if (logoFile) {
          try {
            const formData = new FormData();
            formData.append("file", logoFile);

            const uploadResponse = await http.post(
              `/stores/${currentStoreId}/upload-logo-image`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              },
            );

            if (uploadResponse.status === 200) {
              console.log("Logo uploaded successfully");
            }
          } catch (uploadErr: any) {
            console.error("Failed to upload logo:", uploadErr);
            setUploadError(
              uploadErr.response?.data?.message ||
                "Failed to upload logo image",
            );
          }
        }

        // Upload cover image if selected
        if (coverFile) {
          try {
            const formData = new FormData();
            formData.append("file", coverFile);

            const uploadResponse = await http.post(
              `/stores/${currentStoreId}/upload-cover-image`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              },
            );

            if (uploadResponse.status === 200) {
              console.log("Cover uploaded successfully");
            }
          } catch (uploadErr: any) {
            console.error("Failed to upload cover:", uploadErr);
            setUploadError(
              uploadErr.response?.data?.message ||
                "Failed to upload cover image",
            );
          }
        }

        const eventName = isEdit ? "storeUpdated" : "storeCreated";
        eventBus.emit(eventName, response.data);
        router.back();
      }
    } catch (error: any) {
      console.error(`Failed to ${isEdit ? "update" : "create"} store:`, error);

      // Parse validation errors from the response
      if (error.response?.data?.field_errors) {
        const fieldErrors = error.response.data.field_errors;

        fieldErrors.forEach(
          (fieldError: { field: string; message: string }) => {
            if (fieldError.field === "name") {
              setStoreNameError(fieldError.message);
            } else if (fieldError.field === "categoriesIds") {
              setCategoriesError(fieldError.message);
            } else if (fieldError.field === "delivery_fee") {
              setDeliveryFeeError(fieldError.message);
            }
          },
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const buttonText = isEdit ? "Save Changes" : "Create Store";

  return (
    <Box component="form" noValidate autoComplete="off" sx={{ width: "100%" }}>
      <FormGroup>
        <Stack>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
            <UploadLogoImage onFileChange={setLogoFile} imageId={logoId} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <UploadCoverImage onFileChange={setCoverFile} imageId={coverId} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <LocationPicker
              onLocationChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              address={address}
              onAddressChange={setAddress}
              error={locationError}
              initialLatitude={latitude ?? undefined}
              initialLongitude={longitude ?? undefined}
            />
          </Box>
          <TextField
            value={deliveryFee}
            onChange={(event) => setDeliveryFee(event.target.value)}
            name="delivery_fee"
            label="Delivery Fee"
            type="number"
            inputProps={{
              step: "0.01",
              min: "0",
            }}
            error={!!deliveryFeeError}
            helperText={deliveryFeeError ?? " "}
            fullWidth
          />
          <TextField
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            name="name"
            label="Name"
            error={!!storeNameError}
            helperText={storeNameError ?? " "}
          />
          <FormControl error={!!categoriesError} fullWidth>
            <InputLabel id="categories-label">Categories</InputLabel>
            <Select
              value={categoriesIds ?? []}
              onChange={(event: SelectChangeEvent<any>) => {
                setCategoriesIds(event.target.value as number[]);
              }}
              labelId="categories-label"
              name="categories_ids"
              label="Categories"
              multiple
              fullWidth
              disabled={categoriesLoading}
              renderValue={(selected: any) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected || []).map((value: number) => {
                    const category = categories.find((cat) => cat.id === value);
                    return (
                      <Chip
                        key={value}
                        label={category?.description || `ID: ${value}`}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.description}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{categoriesError ?? " "}</FormHelperText>
          </FormControl>
        </Stack>
      </FormGroup>
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          size="large"
          loading={isSubmitting}
        >
          {buttonText}
        </Button>
      </Stack>
    </Box>
  );
}
