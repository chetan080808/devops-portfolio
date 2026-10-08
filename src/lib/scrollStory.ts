/**
 * Scroll-driven progress values (0–1) written by GSAP ScrollTriggers on the DOM side and read
 * every frame by the 3D scene. Plain module: no React, no three.
 */
export const scrollStory = {
  /** 4a: hero → Deployments: the whale leaves the hero and swims down above the project cards */
  approach: 0,
  /** 4a: (pinned) minis detach one by one and drop into the project cards */
  drop: 0,
  /** True while the 3D drop is active (desktop, motion allowed); cards then hide their 2D icon */
  dropActive: false,
};

/** 4a: the project cards pin with their top at this share of the viewport height */
export const DROP_PIN_AT = 0.6;

/**
 * Each mini gets an equal slot of the pinned scroll: it flies during the first DROP_FLIGHT of its
 * slot, then there's a clear pause before the next one leaves the whale.
 */
export const DROP_FLIGHT = 0.62;

/** 0–1 flight progress of mini `i` (of `n`) for overall drop progress `p`. */
export function miniDropProgress(p: number, i: number, n: number) {
  const slot = 1 / Math.max(1, n);
  return Math.min(1, Math.max(0, (p - i * slot) / (slot * DROP_FLIGHT)));
}
