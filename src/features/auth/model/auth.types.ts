export interface Credentials {
  email: string;
  password: string;
}

/** Credentials plus the "remember me" choice made in the sign-in form. */
export interface SignInInput extends Credentials {
  remember: boolean;
}

/** Field name → message, for the fields a form can highlight. */
export type CredentialErrors = Partial<Record<keyof Credentials, string>>;
