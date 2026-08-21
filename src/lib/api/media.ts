import { env } from "@/lib/config/env";
import http from "@/lib/api/httpClient";

/** Public URL of an image served by the API, by its id. */
export function imageUrl(imageId: number | null | undefined): string | undefined {
  return imageId ? `${env.apiBaseUrl}/images/${imageId}` : undefined;
}

/**
 * Uploads a single file as `multipart/form-data`.
 *
 * Every image upload endpoint in the API shares this shape, so callers only supply
 * the path.
 */
export async function uploadFile(path: string, file: File): Promise<void> {
  const body = new FormData();
  body.append("file", file);

  await http.post(path, body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** Reads a `File` into a data URL suitable for an `<img src>` preview. */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
