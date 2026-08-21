/**
 * The only module allowed to touch browser storage for auth tokens.
 *
 * "Remember me" decides between `localStorage` (survives the browser session) and
 * `sessionStorage` (cleared on tab close). Readers must not care which was used, so
 * every getter probes local first, then session.
 */

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const isBrowser = () => typeof window !== "undefined";

function read(key: string): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

/** Where the current session lives, or `null` when there is no session. */
function activeStorage(): Storage | null {
  if (!isBrowser()) return null;
  if (localStorage.getItem(REFRESH_TOKEN_KEY) !== null) return localStorage;
  if (sessionStorage.getItem(REFRESH_TOKEN_KEY) !== null) return sessionStorage;
  return null;
}

export const tokenStorage = {
  getAccessToken: (): string | null => read(ACCESS_TOKEN_KEY),

  getRefreshToken: (): string | null => read(REFRESH_TOKEN_KEY),

  /** True when both tokens are present, i.e. a session can be resumed. */
  hasSession: (): boolean =>
    read(ACCESS_TOKEN_KEY) !== null && read(REFRESH_TOKEN_KEY) !== null,

  /**
   * Persists a freshly issued token pair.
   *
   * @param remember `true` to survive browser restarts, `false` for tab-scoped.
   */
  save: (tokens: AuthTokens, { remember }: { remember: boolean }): void => {
    if (!isBrowser()) return;
    tokenStorage.clear();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },

  /** Replaces the pair after a silent refresh, keeping the original storage choice. */
  update: (tokens: AuthTokens): void => {
    const storage = activeStorage();
    if (!storage) return;
    storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },

  clear: (): void => {
    if (!isBrowser()) return;
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
};
