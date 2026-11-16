export interface Chime {
  unlock: () => Promise<boolean>;
  play: () => void;
  close: () => void;
}

type AudioContextConstructor = typeof AudioContext;

function audioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  );
}

const NOTES_HZ = [880, 1174.66];
const NOTE_SECONDS = 0.18;

export function createChime(): Chime {
  let context: AudioContext | null = null;

  const ensureContext = () => {
    if (context) return context;
    const Constructor = audioContextConstructor();
    if (!Constructor) return null;
    context = new Constructor();
    return context;
  };

  return {
    async unlock() {
      const audio = ensureContext();
      if (!audio) return false;
      try {
        if (audio.state === "suspended") await audio.resume();
      } catch {
        return false;
      }
      return audio.state === "running";
    },

    play() {
      const audio = context;
      if (!audio || audio.state !== "running") return;
      NOTES_HZ.forEach((frequency, index) => {
        const start = audio.currentTime + index * NOTE_SECONDS;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_SECONDS);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + NOTE_SECONDS);
      });
    },

    close() {
      void context?.close().catch(() => {});
      context = null;
    },
  };
}
