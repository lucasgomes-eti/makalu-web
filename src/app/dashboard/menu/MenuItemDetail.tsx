"use client";

import * as React from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import http from "@/components/http";

interface Configuration {
  name: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "QUANTITY";
  options: string[];
}

interface MenuItem {
  id: number;
  store_id: number;
  category: string;
  name: string;
  price: number;
  ingredients: string;
  configurations: Configuration[];
  image_id?: number | null;
}

const SESSION_STORAGE_KEY = "selectedStoreId";

export default function MenuItemDetail() {
  const router = useRouter();
  const params = useParams();
  const menuItemId = params?.menuItemId as number | undefined;

  const [loading, setLoading] = useState(!!menuItemId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<MenuItem, "id" | "store_id">>({
    name: "",
    category: "",
    price: 0,
    ingredients: "",
    configurations: [],
    image_id: undefined,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newOption, setNewOption] = useState("");
  const [addingConfigIndex, setAddingConfigIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (menuItemId) {
      fetchMenuItem();
    }
  }, [menuItemId]);

  const fetchMenuItem = async () => {
    try {
      const storeId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!storeId) {
        setError("No store selected");
        return;
      }

      const response = await http.get(`/stores/${storeId}/menu/${menuItemId}`);
      if (response.status === 200) {
        setFormData(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch menu item:", err);
      setError("Failed to load menu item");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>,
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" ? parseFloat(value as string) || 0 : value,
    }));
  };

  const addConfiguration = () => {
    setFormData((prev) => ({
      ...prev,
      configurations: [
        ...prev.configurations,
        { name: "", type: "SINGLE_CHOICE", options: [] },
      ],
    }));
  };

  const removeConfiguration = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      configurations: prev.configurations.filter((_, i) => i !== index),
    }));
  };

  const updateConfiguration = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      configurations: prev.configurations.map((config, i) =>
        i === index ? { ...config, [field]: value } : config,
      ),
    }));
  };

  const addOption = (configIndex: number) => {
    if (!newOption.trim()) return;

    updateConfiguration(configIndex, "options", [
      ...formData.configurations[configIndex].options,
      newOption,
    ]);
    setNewOption("");
    setAddingConfigIndex(null);
  };

  const removeOption = (configIndex: number, optionIndex: number) => {
    const updatedOptions = formData.configurations[configIndex].options.filter(
      (_, i) => i !== optionIndex,
    );
    updateConfiguration(configIndex, "options", updatedOptions);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (storeId: string, itemId: number) => {
    if (!selectedFile) return;

    try {
      const formDataForUpload = new FormData();
      formDataForUpload.append("file", selectedFile);

      const response = await http.post(
        `/stores/${storeId}/menu/${itemId}/upload-image`,
        formDataForUpload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.status === 200 || response.status === 201) {
        setSelectedFile(null);
        setImagePreview(null);
        // Refresh the menu item to get the new imageId if editing
        if (menuItemId) {
          await fetchMenuItem();
        }
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
      setUploadError("Failed to upload image");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const storeId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!storeId) {
        setError("No store selected");
        return;
      }

      const requestData = {
        name: formData.name,
        category: formData.category,
        price: formData.price,
        ingredients: formData.ingredients,
        configurations: formData.configurations,
      };

      let savedItemId: number | undefined = menuItemId;

      if (menuItemId) {
        // Edit existing item
        const response = await http.put(
          `/stores/${storeId}/menu/${menuItemId}`,
          requestData,
        );
        if (response.status === 204) {
          savedItemId = menuItemId;
        }
      } else {
        // Create new item
        const response = await http.post(
          `/stores/${storeId}/menu`,
          requestData,
        );
        if (response.status === 201) {
          savedItemId = response.data.id;
        }
      }

      // Upload image after successful save if a file was selected
      if (selectedFile && savedItemId) {
        await uploadImage(storeId, savedItemId);
      }

      // Navigate back after everything is complete
      router.back();
    } catch (err) {
      console.error("Failed to save menu item:", err);
      setError("Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", mx: "auto", py: 4 }}>
      <h1>{menuItemId ? "Edit Menu Item" : "Add Menu Item"}</h1>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {uploadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setUploadError(null)}
        >
          {uploadError}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          fullWidth
          required
        />

        <TextField
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          fullWidth
          required
        />

        <TextField
          label="Price"
          name="price"
          type="number"
          inputProps={{ step: "0.01", min: "0" }}
          value={formData.price}
          onChange={handleInputChange}
          fullWidth
          required
        />

        <TextField
          label="Ingredients"
          name="ingredients"
          value={formData.ingredients}
          onChange={handleInputChange}
          fullWidth
          multiline
          rows={2}
        />

        {/* Image Section */}
        <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee" }}>
          <h3 style={{ margin: "0 0 16px 0" }}>Menu Item Image</h3>

          {/* Display current image if editing */}
          {menuItemId && formData.image_id && !imagePreview && (
            <Box sx={{ mb: 2 }}>
              <img
                src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/stores/${sessionStorage.getItem(SESSION_STORAGE_KEY)}/menu/${menuItemId}/image/${formData.image_id}`}
                alt="Menu item"
                style={{
                  maxWidth: "100%",
                  maxHeight: "300px",
                  borderRadius: "8px",
                  border: "1px solid #eee",
                }}
              />
            </Box>
          )}

          {/* Image preview */}
          {imagePreview && (
            <Box sx={{ mb: 2 }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "300px",
                  borderRadius: "8px",
                  border: "1px solid #eee",
                }}
              />
            </Box>
          )}

          {/* File input */}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: "none" }}
            id="image-input"
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              component="label"
              htmlFor="image-input"
              startIcon={<CloudUploadIcon />}
            >
              Choose Image
            </Button>
            {selectedFile && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setSelectedFile(null);
                  setImagePreview(null);
                }}
              >
                Clear
              </Button>
            )}
          </Box>
          {selectedFile && (
            <Box sx={{ mt: 1, color: "text.secondary", fontSize: "0.875rem" }}>
              Selected: {selectedFile.name}
            </Box>
          )}
        </Box>

        {/* Configurations Section */}
        <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <h3 style={{ margin: 0 }}>Configurations</h3>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={addConfiguration}
            >
              Add Configuration
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formData.configurations.map((config, configIndex) => (
              <Card key={configIndex} variant="outlined">
                <CardContent sx={{ pb: 2, "&:last-child": { pb: 2 } }}>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid>
                      <TextField
                        label="Configuration Name"
                        value={config.name}
                        onChange={(e) =>
                          updateConfiguration(
                            configIndex,
                            "name",
                            e.target.value,
                          )
                        }
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={config.type}
                          label="Type"
                          onChange={(e) =>
                            updateConfiguration(
                              configIndex,
                              "type",
                              e.target.value,
                            )
                          }
                        >
                          <MenuItem value="SINGLE_CHOICE">
                            Single Choice
                          </MenuItem>
                          <MenuItem value="MULTIPLE_CHOICE">
                            Multiple Choice
                          </MenuItem>
                          <MenuItem value="QUANTITY">Quantity</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* Options */}
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        mb: 1,
                        alignItems: "center",
                      }}
                    >
                      {addingConfigIndex === configIndex ? (
                        <>
                          <TextField
                            size="small"
                            placeholder="Add option"
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                addOption(configIndex);
                              }
                            }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => addOption(configIndex)}
                          >
                            Add
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setAddingConfigIndex(null);
                              setNewOption("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => setAddingConfigIndex(configIndex)}
                        >
                          Add Option
                        </Button>
                      )}
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {config.options.map((option, optionIndex) => (
                        <Chip
                          key={optionIndex}
                          label={option}
                          onDelete={() =>
                            removeOption(configIndex, optionIndex)
                          }
                        />
                      ))}
                    </Box>
                  </Box>

                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => removeConfiguration(configIndex)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mt: 3,
            pt: 2,
            borderTop: "1px solid #eee",
          }}
        >
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving..." : menuItemId ? "Update" : "Create"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
