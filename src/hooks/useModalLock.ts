"use client";

import { useEffect } from "react";

/**
 * While a modal panel is open the page doesn't move at all: the viewport can't scroll (wheel,
 * touch, keys), scrolling inside the panel never chains to the page, and the scrollbar's gutter
 * stays reserved (no layout shift). On close the exact scroll position comes back and focus
 * returns to the element that opened the panel WITHOUT scrolling it into view — scrolling the
 * page would drive the GSAP scroll story (e.g. undo the containers' drop into the cards).
 */
export function useModalLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const { body } = document;
    const opener = document.activeElement as HTMLElement | null;
    const y = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      gutter: html.style.scrollbarGutter,
      overscroll: html.style.overscrollBehavior,
    };
    html.style.scrollbarGutter = "stable";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.overscroll;
      html.style.scrollbarGutter = prev.gutter;
      // `instant`: html has scroll-behavior: smooth, which would animate through the scroll story.
      if (window.scrollY !== y) window.scrollTo({ top: y, behavior: "instant" });
      opener?.focus({ preventScroll: true });
    };
  }, [active]);
}
