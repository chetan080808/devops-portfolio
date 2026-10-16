import { createContext, useContext } from "react";
import { sceneStore } from "@/lib/sceneStore";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);
export const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Normalized 0–1 progress of a tween that starts at `start` and lasts `duration` (seconds). */
export const span = (t: number, start: number, duration: number) => clamp01((t - start) / duration);

/** Intro time a settled start begins at: past every intro tween (same as reduced motion). */
const SETTLED_START = 1e4;

/** Longest step the intro (and anything timed with it, e.g. the swim cycle) advances in one frame (s). */
export const MAX_STEP = 1 / 20;

/**
 * Shared clock for the hero intro. It advances only on rendered frames (ticked once per frame
 * by IntroTicker), capped per frame, so when rendering pauses — hero scrolled out of view,
 * background tab — the intro resumes where it left off instead of jumping ahead.
 * Starts after the boot overlay is gone; `skip` (reduced motion) renders the settled state.
 * With `introSettled` (the still was on screen) it starts at the end of the intro, so the 3D
 * replaces the still in the same settled pose (the still IS that first frame, see
 * scripts/capture-hero-still.mjs) and the idle motion simply carries on.
 */
export class IntroClock {
  private elapsed = 0;
  private started = false;
  constructor(private readonly skip: boolean) {}

  /** Reduced motion: the scene is held still (no idle bob, follow, spin or swim). */
  get still() {
    return this.skip;
  }

  tick(delta: number) {
    if (!this.started) {
      const { bootDone, introSettled } = sceneStore.get();
      this.started = bootDone;
      if (bootDone && introSettled) this.elapsed = SETTLED_START;
      if (bootDone) sceneStore.set({ introStarted: true });
    }
    if (this.started) this.elapsed += Math.min(delta, MAX_STEP);
  }

  /** Seconds of intro played so far; −1 while the boot overlay is still up. */
  time(): number {
    if (this.skip) return SETTLED_START;
    return this.started ? this.elapsed : -1;
  }
}

export const IntroContext = createContext<IntroClock>(new IntroClock(true));
export const useIntroClock = () => useContext(IntroContext);
