import http from "@/lib/api/httpClient";

/** The signed-in user, as returned by `GET /profile`. */
export interface Profile {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  profile_image_id: number | null;
}

export async function getProfile(signal?: AbortSignal): Promise<Profile> {
  const { data } = await http.get<Profile>("/profile", { signal });
  return data;
}
