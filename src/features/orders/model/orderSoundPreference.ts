const STORAGE_KEY = "orders.newOrderSound";

/**
 * Remembers, per browser, whether the store wants a sound for new orders.
 *
 * Off until the store turns it on: a browser will not play audio before the user has
 * interacted with the page, and the click that turns the sound on is that interaction.
 */
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
