"use client";

export function playCountdownTick(second: number) {
  if (typeof window === "undefined") return;

  const windowWithAudio = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextCtor =
    window.AudioContext ?? windowWithAudio.webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = second <= 3 ? 0.14 : 0.08;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(second <= 3 ? 880 : 620, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      second <= 3 ? 0.12 : 0.07,
      now + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => void context.close();
  } catch {
    // Browsers may block audio until the user has interacted with the page.
  }
}
