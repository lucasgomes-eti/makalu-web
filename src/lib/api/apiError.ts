import axios from "axios";

/** Error envelope returned by the Makalu API. */
export interface ErrorResponse {
  http_code: number;
  message: string;
  internal_code: string;
  field_errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

/** Normalised failure that every layer above the API modules can rely on. */
export interface ApiError {
  status: number;
  message: string;
  internalCode: string | null;
  /** Field name (as sent by the API) → message. */
  fieldErrors: Record<string, string>;
}

const UNKNOWN: Omit<ApiError, "message"> = {
  status: 0,
  internalCode: null,
  fieldErrors: {},
};

function indexFieldErrors(errors: FieldError[] | undefined) {
  const indexed: Record<string, string> = {};
  for (const error of errors ?? []) {
    if (error?.field) indexed[error.field] = error.message;
  }
  return indexed;
}

/**
 * Turns anything thrown by an API call into an {@link ApiError}.
 *
 * The backend's own `message`/`internal_code` is preferred over Axios' generic
 * "Request failed with status code 4xx", which is useless to a user.
 */
export function toApiError(error: unknown, fallbackMessage: string): ApiError {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    const body = error.response?.data;

    if (body?.message) {
      return {
        status: body.http_code ?? error.response?.status ?? 0,
        message: body.message,
        internalCode: body.internal_code ?? null,
        fieldErrors: indexFieldErrors(body.field_errors),
      };
    }

    return {
      ...UNKNOWN,
      status: error.response?.status ?? 0,
      message: error.response ? fallbackMessage : "Network error. Please try again.",
    };
  }

  return { ...UNKNOWN, message: fallbackMessage };
}

/** Human-readable form, including the backend's code when present. */
export function formatApiError(error: ApiError): string {
  return error.internalCode
    ? `(${error.internalCode}) ${error.message}`
    : error.message;
}
