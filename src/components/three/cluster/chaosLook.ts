import { victimPhase } from "@/lib/chaos";
import { expoOut } from "../intro";

export interface ChaosLook {
  /** 0–1 blend of the neon towards red */
  red: number;
  /** Multiplier on the neon's emissive intensity */
  glow: number;
  /** 0–1: node sunk and tilted (crashed) */
  sink: number;
  /** Extra core flash on restart */
  flash: number;
}

export const HEALTHY: ChaosLook = { red: 0, glow: 1, sink: 0, flash: 0 };
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Ragged, never fully dark flicker (~0.3–1.2). Small elements and no full on/off swing, so it
 * reads as "failing" without strobing.
 */
function flicker(t: number, seed: number) {
  const base = 0.75 + 0.45 * Math.sin(t * 31 + seed * 3.1) * Math.sin(t * 19.7 + seed);
  return Math.sin(t * 11 + seed * 7) > 0.82 ? 0.3 : base;
}

/** How victim `i` (seeded by its node id) looks `t` s into a chaos run. `still` = reduced motion. */
export function chaosLook(i: number, node: number, t: number, still: boolean): ChaosLook {
  const { phase, k } = victimPhase(i, t);
  switch (phase) {
    case "healthy":
      return HEALTHY;
    case "crashing": {
      const fade = 1 - 0.55 * smooth(0.6, 1, k);
      return {
        red: smooth(0, 0.35, k),
        glow: (still ? 0.9 : flicker(t, node)) * fade,
        sink: still ? 0 : smooth(0.65, 1, k),
        flash: 0,
      };
    }
    case "down":
      return { red: 1, glow: 0.3 + (still ? 0 : 0.08 * Math.sin(t * 3 + node)), sink: still ? 0 : 1, flash: 0 };
    case "healing": {
      const e = expoOut(k);
      return { red: 1 - e, glow: 0.3 + 0.7 * e, sink: still ? 0 : 1 - e, flash: 2.4 * Math.exp(-k * 4) };
    }
  }
}
