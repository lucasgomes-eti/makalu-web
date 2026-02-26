"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormHelperText from "@mui/material/FormHelperText";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent, SelectProps } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import dayjs, { Dayjs } from "dayjs";
import type { StoreRequest } from "../StoreRequest";
import { useRouter } from "next/navigation";
import http from "@/components/http";
import { useState } from "react";
import UploadLogoImage from "./UploadLogoImage";
import UploadCoverImage from "./UploadCoverImage";
import eventBus from "@/functions/eventBus";

interface Category {
  id: number;
  description: string;
}

export default function NewStore() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [storeName, setStoreName] = useState("");
  const [storeNameError, setStoreNameError] = useState<string | null>(null);

  const [categoriesIds, setCategoriesIds] = useState<number[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

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

    try {
      const response = await http.post("/stores", {
        name: storeName,
        categories_ids: categoriesIds,
      });
      if (response.status === 201) {
        const storeId = response.data.id;

        // Upload logo image if selected
        if (logoFile) {
          try {
            const formData = new FormData();
            formData.append("file", logoFile);

            const uploadResponse = await http.post(
              `/stores/${storeId}/upload-logo-image`,
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
              `/stores/${storeId}/upload-cover-image`,
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

        eventBus.emit("storeCreated", response.data);
        router.back();
      }
    } catch (error: any) {
      console.error("Failed to create store:", error);

      // Parse validation errors from the response
      if (error.response?.data?.field_errors) {
        const fieldErrors = error.response.data.field_errors;

        fieldErrors.forEach(
          (fieldError: { field: string; message: string }) => {
            if (fieldError.field === "name") {
              setStoreNameError(fieldError.message);
            } else if (fieldError.field === "categoriesIds") {
              setCategoriesError(fieldError.message);
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

  return (
    <Box component="form" noValidate autoComplete="off" sx={{ width: "100%" }}>
      <FormGroup>
        <Stack>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
            <UploadLogoImage onFileChange={setLogoFile} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <UploadCoverImage onFileChange={setCoverFile} />
          </Box>
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
          Create Store
        </Button>
      </Stack>
    </Box>
  );
}
