/**
 * Scroll-driven progress values (0–1) written by GSAP ScrollTriggers on the DOM side and read
 * every frame by the 3D scene. Plain module: no React, no three.
 */
export const scrollStory = {
  /** 4a: minis travel from the whale's back into the project cards */
  drop: 0,
  /** True while the 3D drop is active (desktop, motion allowed); cards then hide their 2D icon */
  dropActive: false,
};

/** Share of the drop progress between one mini leaving the whale and the next */
export const DROP_STAGGER = 0.16;

/** 0–1 progress of mini `i` (of `n`) for overall drop progress `p`. */
export function miniDropProgress(p: number, i: number, n: number) {
  const span = Math.max(0.2, 1 - DROP_STAGGER * (n - 1));
  return Math.min(1, Math.max(0, (p - i * DROP_STAGGER) / span));
}
