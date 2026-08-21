import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { env } from "@/lib/config/env";
import { tokenStorage, AuthTokens } from "@/lib/auth/tokenStorage";

/** Where the browser is sent once the session can no longer be recovered. */
export const SIGN_IN_PATH = "/sign-in";

export const http = axios.create({ baseURL: env.apiBaseUrl });

/**
 * Bare client for the refresh call itself. Using `http` here would recurse through
 * the interceptors below the moment the refresh request also returned a 401.
 */
const refreshClient = axios.create({ baseURL: env.apiBaseUrl });

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * Reads the token at request time rather than capturing it, so a refreshed token is
 * picked up immediately — including by the retry of the request that triggered it.
 */
http.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

/**
 * Concurrent 401s must trigger exactly one refresh; the rest await the same promise.
 */
let inFlightRefresh: Promise<AuthTokens> | null = null;

function refreshSession(): Promise<AuthTokens> {
  inFlightRefresh ??= (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");

    const { data } = await refreshClient.post<AuthTokens>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    tokenStorage.update(data);
    return data;
  })().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}

function endSession() {
  tokenStorage.clear();
  if (typeof window !== "undefined") {
    window.location.assign(SIGN_IN_PATH);
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    // `_retried` stops a request that 401s again after a successful refresh from
    // looping forever.
    if (error.response?.status !== 401 || !config || config._retried) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      await refreshSession();
      return await http(config);
    } catch (refreshError) {
      endSession();
      return Promise.reject(refreshError);
    }
  },
);

export default http;
