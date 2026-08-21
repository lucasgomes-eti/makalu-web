import { Credentials, CredentialErrors } from "./auth.types";

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/**
 * Pure client-side credential check.
 *
 * Returning the errors — rather than pushing them into React state and reading that
 * state back in the same event — is what makes the guard reliable. The previous
 * implementation set state and then tested the pre-update value, so the first invalid
 * submit still reached the network.
 *
 * @returns an empty object when the credentials are well-formed.
 */
export function validateCredentials(credentials: Credentials): CredentialErrors {
  const errors: CredentialErrors = {};

  if (!EMAIL_PATTERN.test(credentials.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (credentials.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }

  return errors;
}

export function hasErrors(errors: CredentialErrors): boolean {
  return Object.keys(errors).length > 0;
}
