"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { NAV_IDS, useActiveSection } from "./NavLinks";

/** Section links below md: a small disclosure menu that drops under the navbar. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const active = useActiveSection(NAV_IDS);
  const reduce = useReducedMotion();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Escape (focus back to the button), a tap outside, or growing past md closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[0.7rem] transition-[color,border-color,background-color,transform] duration-200 active:scale-95",
          open ? "border-cyan/40 bg-cyan/[0.07] text-cyan" : "border-line-strong text-muted hover:text-fg",
        )}
      >
        <span aria-hidden="true" className="flex w-3 flex-col gap-[3px]">
          <span className={cn("h-px bg-current transition-transform duration-200", open && "translate-y-1 rotate-45")} />
          <span className={cn("h-px bg-current transition-opacity duration-200", open && "opacity-0")} />
          <span className={cn("h-px bg-current transition-transform duration-200", open && "-translate-y-1 -rotate-45")} />
        </span>
        menu
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            // Solid, not glass: inside the navbar's backdrop-filter a second blur only sees the navbar.
            className="absolute inset-x-4 top-[4.25rem] rounded-xl border border-line-strong bg-bg-raised p-2 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)] sm:inset-x-6"
          >
            <ul className="grid gap-1">
              {site.nav.map((item) => {
                const current = active === item.href.slice(1);
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={current ? "location" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-3 font-mono text-sm transition-colors active:bg-white/5",
                        current ? "bg-cyan/[0.07] text-cyan" : "text-muted hover:text-fg",
                      )}
                    >
                      <span>
                        <span aria-hidden="true" className="text-faint">
                          ./
                        </span>
                        {item.label}
                      </span>
                      {current && (
                        <span aria-hidden="true" className="text-[0.65rem] text-cyan/80">
                          ● here
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
