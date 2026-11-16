"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chime, createChime } from "@/lib/audio/chime";
import { orderSoundPreference } from "../model/orderSoundPreference";

export function useNewOrderSound() {
  const [enabled, setEnabled] = useState(false);
  const chime = useRef<Chime | null>(null);

  const getChime = useCallback(() => {
    chime.current ??= createChime();
    return chime.current;
  }, []);

  useEffect(() => {
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

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    orderSoundPreference.write(next);
    if (next) {
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
