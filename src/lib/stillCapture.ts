/**
 * `?still`: capture mode for scripts/capture-hero-still.mjs. The hero starts settled (exactly like
 * a visit where the still was on screen) and the render loop stops at its first visible frame,
 * whose pixels ARE the frame the 3D takes over with. Plain module (main bundle and 3D chunk).
 */
export const STILL_CAPTURE = typeof location !== "undefined" && new URLSearchParams(location.search).has("still");
