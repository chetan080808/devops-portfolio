import { createContext, useContext } from "react";
import { sceneStore } from "@/lib/sceneStore";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);
export const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Normalized 0–1 progress of a tween that starts at `start` and lasts `duration` (seconds). */
export const span = (t: number, start: number, duration: number) => clamp01((t - start) / duration);

/**
 * Shared clock for the hero intro. Starts on the first frame after the boot overlay is gone;
 * `skip` (reduced motion) jumps straight to the settled state.
 */
export class IntroClock {
  private start: number | null = null;
  constructor(private readonly skip: boolean) {}

  /** Seconds since the intro started; −1 while the boot overlay is still up. */
  time(elapsed: number): number {
    if (this.skip) return 1e4;
    if (this.start === null) {
      if (!sceneStore.get().bootDone) return -1;
      this.start = elapsed;
    }
    return elapsed - this.start;
  }
}

export const IntroContext = createContext<IntroClock>(new IntroClock(true));
export const useIntroClock = () => useContext(IntroContext);
