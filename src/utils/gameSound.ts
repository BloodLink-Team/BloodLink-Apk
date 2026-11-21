/** Tiny sound effects for the games, made with the Web Audio API (no audio files needed). */
let ctx: AudioContext | null = null;
const MUTE_KEY = "bloodlink_game_muted";

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
})();

export const isMuted = () => muted;
export function setMuted(v: boolean): void {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

function audio(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.16, slideTo?: number, delay = 0) {
  if (muted) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  /** call from a tap so the browser allows sound */
  unlock: () => {
    audio();
  },
  start: () => {
    tone(440, 0.12, "triangle", 0.14);
    tone(660, 0.16, "triangle", 0.14, undefined, 0.11);
  },
  catchDrop: () => {
    tone(700, 0.09, "sine", 0.16, 1100);
  },
  hitGerm: () => {
    tone(200, 0.28, "sawtooth", 0.13, 70);
  },
  over: () => {
    tone(440, 0.2, "triangle", 0.15, undefined, 0);
    tone(349, 0.2, "triangle", 0.15, undefined, 0.18);
    tone(262, 0.4, "triangle", 0.15, undefined, 0.36);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.15, undefined, i * 0.12));
  },
  flip: () => {
    tone(520, 0.06, "triangle", 0.12);
  },
  match: () => {
    tone(600, 0.1, "sine", 0.15);
    tone(900, 0.16, "sine", 0.15, undefined, 0.09);
  },
  miss: () => {
    tone(240, 0.16, "square", 0.07, 180);
  },
};
