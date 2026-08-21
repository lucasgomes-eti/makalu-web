import http from "@/lib/api/httpClient";
import { AuthTokens } from "@/lib/auth/tokenStorage";
import { Credentials } from "../model/auth.types";

/** Exchanges credentials for a token pair. */
export async function login(credentials: Credentials): Promise<AuthTokens> {
  const { data } = await http.post<AuthTokens>("/auth/login", credentials);
  return data;
}
