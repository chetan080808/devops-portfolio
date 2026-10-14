/**
 * Boot timing shared by the pre-paint gate script (server-rendered string), the CSS-driven parts
 * of the overlay and the React timeline. Plain module: importable from server and client code.
 */

/** Typing is a CSS animation (BootSequence) so it starts at first paint, not at hydration. */
export const TYPE_DELAY_MS = 120;
export const CHAR_MS = 22;
/** Gap between the fixed log lines; they are CSS-timed too (no wait for hydration). */
export const LINE_MS = 130;

/** When the i-th fixed log line appears, measured from first paint. */
export const lineDelayMs = (i: number, commandLength: number) => TYPE_DELAY_MS + commandLength * CHAR_MS + 160 + i * LINE_MS;

/**
 * Exit transitions (`html[data-boot=leaving][data-boot-transition=…]`, keyframes in globals.css).
 * Chosen by `?transition=doors|crt` (default doors); reduced motion → fade; Skip → quick fade.
 */
export const BOOT_TRANSITIONS = ["doors", "crt"] as const;
export const EXIT_MS: Record<string, number> = { doors: 640, crt: 620, fade: 400, skip: 220 };

/**
 * Safety net: if the React timeline hasn't taken over by now (slow hydration on a throttled
 * phone), the gate script plays the exit itself, so the overlay never hangs.
 */
export const FALLBACK_EXIT_MS = 4500;
/** How long the safety net shows its closing line before the exit starts. */
export const FALLBACK_HOLD_MS = 380;
