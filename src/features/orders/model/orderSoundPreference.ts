const STORAGE_KEY = "orders.newOrderSound";

export const orderSoundPreference = {
  read(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "on";
  },

  write(enabled: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  },
};
