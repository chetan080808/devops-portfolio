import { useEffect } from "react";
import { Vector2 } from "three";

/**
 * Mouse state shared by the 3D scene (desktop only).
 * - `client`: last cursor position in viewport px; `movedAt`: performance.now() of the last move
 * - `inside`: cursor is on the page
 * - `target` / `smoothed`: −1…1 viewport coords (y up) for the camera's subtle parallax; `smoothed`
 *   eases toward `target` once per frame (IntroTicker).
 */
export const pointer = {
  enabled: false,
  inside: false,
  movedAt: -Infinity,
  client: new Vector2(),
  target: new Vector2(),
  smoothed: new Vector2(),
};

/** The cursor drives the whale only while it's on the page and has moved in the last 3 s. */
export const FOLLOW_IDLE_MS = 3000;
export const pointerFollowing = (now = performance.now()) =>
  pointer.enabled && pointer.inside && now - pointer.movedAt < FOLLOW_IDLE_MS;

const PARALLAX_RATE = 2.6; // 1/s

export function smoothPointer(delta: number) {
  pointer.smoothed.lerp(pointer.target, 1 - Math.exp(-PARALLAX_RATE * delta));
}

/**
 * Track the mouse on the window (the canvas ignores pointer events so it never blocks the hero
 * buttons). Mouse only: touch and pen never drive the scene. Disabled → recentre, idle.
 */
export function usePointerFollow(enabled: boolean) {
  useEffect(() => {
    pointer.enabled = enabled;
    pointer.inside = false;
    pointer.target.set(0, 0);
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.inside = true;
      pointer.movedAt = performance.now();
      pointer.client.set(e.clientX, e.clientY);
      pointer.target.set((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2);
    };
    const leave = () => {
      pointer.inside = false;
      pointer.target.set(0, 0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", leave);
      window.removeEventListener("blur", leave);
      pointer.enabled = false;
    };
  }, [enabled]);
}
