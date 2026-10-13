"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const isScrolled = () => window.scrollY > 8;

/**
 * The navbar's glass bar. Over the hero it stays light glass; once the page scrolls, content
 * passes under it (project titles, dashboard numbers), so it turns near-opaque with a stronger
 * blur and never competes with the text behind it.
 */
export function NavFrame({ children }: { children: ReactNode }) {
  // false on the server and during hydration
  const scrolled = useSyncExternalStore(subscribe, isScrolled, () => false);

  return (
    <nav
      aria-label="Primary"
      data-scrolled={scrolled ? "yes" : "no"}
      className={[
        "glass mx-auto flex h-12 max-w-6xl items-center justify-between rounded-xl px-4",
        // Phones: a full-width bar from the very top, including the safe area (notch / status bar).
        "max-md:box-content max-md:rounded-none max-md:border-x-0 max-md:border-t-0 max-md:pt-[env(safe-area-inset-top)]",
        "transition-[background,box-shadow,border-color] duration-300",
        // Attribute selector outranks the glass utility's own background / backdrop-filter.
        "data-[scrolled=yes]:border-line-strong data-[scrolled=yes]:[background:rgb(5_7_13/0.9)]",
        "data-[scrolled=yes]:[backdrop-filter:blur(24px)_saturate(160%)] data-[scrolled=yes]:[-webkit-backdrop-filter:blur(24px)_saturate(160%)]",
        "data-[scrolled=yes]:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.9)]",
      ].join(" ")}
    >
      {children}
    </nav>
  );
}
