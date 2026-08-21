const STORAGE_KEY = "selectedStoreId";

/**
 * Remembers the store the user last worked on, for the current tab only.
 *
 * This is a *preference*, not application state — the live value lives in
 * `SelectedStoreProvider`. Isolating the key here is what removed the three
 * independent `sessionStorage.getItem("selectedStoreId")` call sites that could
 * silently disagree with each other.
 */
export const selectedStorePreference = {
  read(): number | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  },

  write(storeId: number): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, String(storeId));
  },

  clear(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEY);
  },
};
