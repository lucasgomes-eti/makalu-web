"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chime, createChime } from "@/lib/audio/chime";
import { orderSoundPreference } from "../model/orderSoundPreference";

/**
 * Use cases: *hear when a new order arrives* and *mute that sound*.
 *
 * Browsers only allow audio after the user has interacted with the page. Turning the
 * sound on is such an interaction; when it was left on from an earlier visit, the
 * first click or key press anywhere on the page enables it again.
 */
export function useNewOrderSound() {
  const [enabled, setEnabled] = useState(false);
  const chime = useRef<Chime | null>(null);

  const getChime = useCallback(() => {
    chime.current ??= createChime();
    return chime.current;
  }, []);

  useEffect(() => {
    // The preference lives in the browser, so it can only be read after hydration.
    setEnabled(orderSoundPreference.read());
    return () => {
      chime.current?.close();
      chime.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const unlock = () => void getChime().unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabled, getChime]);

  /** Call from a click: it is the gesture that lets the browser play audio. */
  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    orderSoundPreference.write(next);
    if (next) {
      // Play it once so the store hears what a new order will sound like.
      void getChime()
        .unlock()
        .then((unlocked) => {
          if (unlocked) getChime().play();
        });
    }
  }, [enabled, getChime]);

  const play = useCallback(() => {
    if (enabled) getChime().play();
  }, [enabled, getChime]);

  return { enabled, toggle, play };
}
