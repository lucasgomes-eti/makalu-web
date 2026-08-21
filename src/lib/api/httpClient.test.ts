import axios, {
  AxiosAdapter,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "@/lib/auth/tokenStorage";

/**
 * These cover the interceptor defects found in review (§1.2): a request interceptor
 * that captured a stale token in a closure and was re-registered on every mount, and
 * a refresh cycle that could therefore never succeed.
 */

interface Handled {
  url: string;
  authorization: string | undefined;
}

/** Requests seen by the fake transport, in order. */
let handled: Handled[] = [];
/** Queue of responses/failures the transport replies with, oldest first. */
let responses: Array<{ status: number; data?: unknown }> = [];

function fakeAdapter(): AxiosAdapter {
  return async (config: AxiosRequestConfig) => {
    handled.push({
      url: config.url ?? "",
      authorization: config.headers?.Authorization as string | undefined,
    });

    const next = responses.shift() ?? { status: 200, data: {} };
    const response = {
      data: next.data ?? {},
      status: next.status,
      statusText: "",
      headers: {},
      config,
    } as AxiosResponse;

    if (next.status >= 400) {
      throw Object.assign(new Error(`Request failed with ${next.status}`), {
        isAxiosError: true,
        config,
        response,
        toJSON: () => ({}),
      });
    }

    return response;
  };
}

async function loadHttpClient() {
  const instances: AxiosInstance[] = [];
  const create = axios.create.bind(axios);
  vi.spyOn(axios, "create").mockImplementation((config) => {
    const instance = create(config);
    instances.push(instance);
    return instance;
  });

  vi.resetModules();
  const clientModule = await import("./httpClient");

  // Both the main client and the refresh client must go through the fake transport.
  for (const instance of instances) {
    instance.defaults.adapter = fakeAdapter();
  }

  return clientModule.default;
}

describe("httpClient", () => {
  beforeEach(() => {
    handled = [];
    responses = [];
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches the stored access token to every request", async () => {
    tokenStorage.save(
      { access_token: "access-1", refresh_token: "refresh-1" },
      { remember: true },
    );
    const http = await loadHttpClient();

    await http.get("/profile");

    expect(handled[0].authorization).toBe("Bearer access-1");
  });

  it("sends no Authorization header when there is no session", async () => {
    const http = await loadHttpClient();

    await http.get("/categories");

    expect(handled[0].authorization).toBeUndefined();
  });

  it("reads the token per request, so a refreshed token is used immediately", async () => {
    tokenStorage.save(
      { access_token: "access-1", refresh_token: "refresh-1" },
      { remember: true },
    );
    const http = await loadHttpClient();

    await http.get("/profile");
    tokenStorage.update({ access_token: "access-2", refresh_token: "refresh-2" });
    await http.get("/profile");

    expect(handled.map((request) => request.authorization)).toEqual([
      "Bearer access-1",
      "Bearer access-2",
    ]);
  });

  it("refreshes on a 401 and retries the original request with the new token", async () => {
    tokenStorage.save(
      { access_token: "expired", refresh_token: "refresh-1" },
      { remember: true },
    );
    const http = await loadHttpClient();

    responses = [
      { status: 401 },
      { status: 200, data: { access_token: "fresh", refresh_token: "refresh-2" } },
      { status: 200, data: { id: 1 } },
    ];

    const response = await http.get("/profile");

    expect(response.data).toEqual({ id: 1 });
    expect(handled.map((request) => request.url)).toEqual([
      "/profile",
      "/auth/refresh",
      "/profile",
    ]);
    // The retry must carry the *new* token — the old code re-applied the expired one.
    expect(handled[2].authorization).toBe("Bearer fresh");
    expect(tokenStorage.getAccessToken()).toBe("fresh");
  });

  it("retries a request only once, so a still-401 response cannot loop", async () => {
    tokenStorage.save(
      { access_token: "expired", refresh_token: "refresh-1" },
      { remember: true },
    );
    const http = await loadHttpClient();

    responses = [
      { status: 401 },
      { status: 200, data: { access_token: "fresh", refresh_token: "refresh-2" } },
      { status: 401 },
    ];

    await expect(http.get("/profile")).rejects.toBeDefined();
    expect(handled).toHaveLength(3);
  });

  it("clears the session when the refresh itself fails", async () => {
    tokenStorage.save(
      { access_token: "expired", refresh_token: "revoked" },
      { remember: true },
    );
    const http = await loadHttpClient();

    responses = [{ status: 401 }, { status: 401 }];

    await expect(http.get("/profile")).rejects.toBeDefined();
    expect(tokenStorage.hasSession()).toBe(false);
    expect(window.location.assign).toHaveBeenCalledWith("/sign-in");
  });

  it("does not attempt a refresh when there is no refresh token", async () => {
    const http = await loadHttpClient();
    responses = [{ status: 401 }];

    await expect(http.get("/profile")).rejects.toBeDefined();
    expect(handled.map((request) => request.url)).toEqual(["/profile"]);
  });

  it("passes non-401 failures straight through", async () => {
    const http = await loadHttpClient();
    responses = [{ status: 500 }];

    await expect(http.get("/stores")).rejects.toBeDefined();
    expect(handled).toHaveLength(1);
  });
});
