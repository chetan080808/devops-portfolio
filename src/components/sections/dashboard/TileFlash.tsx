"use client";

import { useEffect, useRef } from "react";

/** How long a tapped tile shows its brand colours, ms */
const FLASH_MS = 1400;

/**
 * Touch devices have no hover: a tap on a skill tile shows its brand colours briefly
 * (`data-flash="on"` on the tile; the colours themselves are CSS in SkillTile). Mouse pointers
 * are ignored (they get the hover). One listener per panel (event delegation on its parent).
 */
export function TileFlash() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const panel = ref.current?.parentElement;
    if (!panel) return;
    const timers = new Map<HTMLElement, number>();
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const tile = (e.target as Element).closest<HTMLElement>("[data-tile]");
      if (!tile) return;
      clearTimeout(timers.get(tile));
      tile.dataset.flash = "on";
      timers.set(
        tile,
        window.setTimeout(() => {
          delete tile.dataset.flash;
          timers.delete(tile);
        }, FLASH_MS),
      );
    };
    panel.addEventListener("pointerup", onUp);
    return () => {
      panel.removeEventListener("pointerup", onUp);
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);
  return <span ref={ref} hidden />;
}
