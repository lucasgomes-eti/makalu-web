import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { ErrorResponse, formatApiError, toApiError } from "./apiError";

const FALLBACK = "Could not save.";

function axiosErrorWith(status: number, data?: ErrorResponse): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    `Request failed with status code ${status}`,
    "ERR_BAD_REQUEST",
    config,
    null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { status, data, statusText: "", headers: {}, config } as any,
  );
}

describe("toApiError", () => {
  it("prefers the backend's message over Axios' generic one", () => {
    const error = toApiError(
      axiosErrorWith(422, {
        http_code: 422,
        message: "Store name is already taken",
        internal_code: "STORE_NAME_TAKEN",
      }),
      FALLBACK,
    );

    expect(error.message).toBe("Store name is already taken");
    expect(error.internalCode).toBe("STORE_NAME_TAKEN");
    expect(error.status).toBe(422);
  });

  it("indexes field errors by field name", () => {
    const error = toApiError(
      axiosErrorWith(422, {
        http_code: 422,
        message: "Validation failed",
        internal_code: "VALIDATION",
        field_errors: [
          { field: "name", message: "Required" },
          { field: "delivery_fee", message: "Must be positive" },
        ],
      }),
      FALLBACK,
    );

    expect(error.fieldErrors).toEqual({
      name: "Required",
      delivery_fee: "Must be positive",
    });
  });

  it("falls back to the caller's message when the body carries none", () => {
    const error = toApiError(axiosErrorWith(500), FALLBACK);

    expect(error.message).toBe(FALLBACK);
    expect(error.status).toBe(500);
    expect(error.fieldErrors).toEqual({});
  });

  it("distinguishes a request that never reached the server", () => {
    const networkError = new AxiosError("Network Error", "ERR_NETWORK", {
      headers: new AxiosHeaders(),
    });

    expect(toApiError(networkError, FALLBACK).message).toBe(
      "Network error. Please try again.",
    );
  });

  it("handles values that are not Axios errors at all", () => {
    expect(toApiError(new TypeError("boom"), FALLBACK).message).toBe(FALLBACK);
    expect(toApiError("a thrown string", FALLBACK).status).toBe(0);
  });
});

describe("formatApiError", () => {
  it("includes the backend code when there is one", () => {
    expect(
      formatApiError({
        status: 401,
        message: "Invalid credentials",
        internalCode: "AUTH_001",
        fieldErrors: {},
      }),
    ).toBe("(AUTH_001) Invalid credentials");
  });

  it("shows just the message otherwise", () => {
    expect(
      formatApiError({
        status: 0,
        message: "Network error.",
        internalCode: null,
        fieldErrors: {},
      }),
    ).toBe("Network error.");
  });
});
