export interface ErrorResponse {
  http_code: number;
  message: string;
  internal_code: string;
  field_errors: string[];
}
