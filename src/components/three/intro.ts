import { createContext, useContext } from "react";
import { sceneStore } from "@/lib/sceneStore";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);
export const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Normalized 0–1 progress of a tween that starts at `start` and lasts `duration` (seconds). */
export const span = (t: number, start: number, duration: number) => clamp01((t - start) / duration);

/** Longest step the intro advances in one frame (s). */
const MAX_STEP = 1 / 20;

/**
 * Shared clock for the hero intro. It advances only on rendered frames (ticked once per frame
 * by IntroTicker), capped per frame, so when rendering pauses — hero scrolled out of view,
 * background tab — the intro resumes where it left off instead of jumping ahead.
 * Starts after the boot overlay is gone; `skip` (reduced motion) renders the settled state.
 */
export class IntroClock {
  private elapsed = 0;
  private started = false;
  constructor(private readonly skip: boolean) {}

  tick(delta: number) {
    if (!this.started) this.started = sceneStore.get().bootDone;
    if (this.started) this.elapsed += Math.min(delta, MAX_STEP);
  }

  /** Seconds of intro played so far; −1 while the boot overlay is still up. */
  time(): number {
    if (this.skip) return 1e4;
    return this.started ? this.elapsed : -1;
  }
}

export const IntroContext = createContext<IntroClock>(new IntroClock(true));
export const useIntroClock = () => useContext(IntroContext);
