"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

/**
 * The section under a probe line ~35% down the viewport, or null while still in the hero.
 * Reads live positions (GSAP pins add spacers, so offsets measured once would drift).
 */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const probe = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= probe) current = id;
      }
      // Scrolled to the very end: the last section can be too short to reach the probe line.
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(atEnd ? ids[ids.length - 1] : current);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);
  return active;
}

export const NAV_IDS = site.nav.map((item) => item.href.slice(1));

/** Section links; the one in view gets a sliding highlight. */
export function NavLinks() {
  const active = useActiveSection(NAV_IDS);
  const reduce = useReducedMotion();

  return (
    <ul className="hidden items-center gap-1 md:flex">
      {site.nav.map((item) => {
        const current = active === item.href.slice(1);
        return (
          <li key={item.href} className="relative">
            {current && (
              <motion.span
                layoutId="nav-active"
                aria-hidden="true"
                className="absolute inset-0 rounded-md border border-cyan/25 bg-cyan/[0.07]"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <a
              href={item.href}
              aria-current={current ? "location" : undefined}
              className={cn(
                "relative block rounded-md px-3 py-1.5 font-mono text-xs transition-[color,background-color,transform] duration-200 active:scale-95",
                current ? "text-cyan" : "text-muted hover:bg-white/5 hover:text-fg",
              )}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
