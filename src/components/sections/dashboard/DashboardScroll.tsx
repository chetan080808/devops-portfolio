"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * 4c. Panels animate in as they enter the viewport (once, like a dashboard loading its queries).
 * Desktop (≥768px) with motion: staggered rise, a loading bar sweeps each header, real numbers count
 * up from 0, a real sparkline draws itself, a real gauge fills, list rows stagger in. Null values
 * ("No data") are never animated as numbers. Mobile: a simple fade. Reduced motion: static.
 * The server HTML is the final state, so no-JS shows the finished dashboard.
 */
export function DashboardScroll() {
  useEffect(() => {
    const panels = gsap.utils.toArray<HTMLElement>("#metrics [data-panel]");
    if (!panels.length) return;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.set(panels, { opacity: 0, y: 28 });
      const batch = ScrollTrigger.batch(panels, {
        start: "top 88%",
        once: true,
        onEnter: (els) => els.forEach((el, i) => reveal(el as HTMLElement, i * 0.09)),
      });
      return () => {
        batch.forEach((t) => t.kill());
        gsap.set(panels, { clearProps: "opacity,transform" });
      };
    });

    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.set(panels, { opacity: 0 });
      const batch = ScrollTrigger.batch(panels, {
        start: "top 92%",
        once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.06 }),
      });
      return () => {
        batch.forEach((t) => t.kill());
        gsap.set(panels, { clearProps: "opacity" });
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}

/** One panel's entrance (desktop). */
function reveal(panel: HTMLElement, delay: number) {
  const tl = gsap.timeline({ delay });
  tl.to(panel, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" });

  const loader = panel.querySelector<HTMLElement>("[data-panel-loader]");
  if (loader) {
    tl.fromTo(loader, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.55, ease: "power2.inOut" }, 0.1).to(loader, {
      opacity: 0,
      duration: 0.3,
    });
  }

  // Count real values up from 0 (null values render "No data" and have no data-countup).
  panel.querySelectorAll<HTMLElement>("[data-countup]").forEach((el) => {
    const target = Number(el.dataset.value);
    if (!Number.isFinite(target)) return;
    const decimals = Number(el.dataset.decimals ?? 0);
    const suffix = el.dataset.suffix ?? "";
    const counter = { v: 0 };
    el.textContent = `${(0).toFixed(decimals)}${suffix}`;
    tl.to(
      counter,
      {
        v: target,
        duration: 1.1,
        ease: "power2.out",
        onUpdate: () => (el.textContent = `${counter.v.toFixed(decimals)}${suffix}`),
      },
      0.25,
    );
  });

  // Real sparkline: draw the line left to right.
  panel.querySelectorAll<SVGPathElement>("[data-spark-line]").forEach((path) => {
    const len = path.getTotalLength();
    tl.fromTo(
      path,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 1.2, ease: "power2.out", clearProps: "strokeDasharray,strokeDashoffset" },
      0.3,
    );
  });

  // Real gauge: fill the arc from empty to its value.
  panel.querySelectorAll<SVGPathElement>("[data-gauge-arc]").forEach((arc) => {
    tl.from(arc, { attr: { "stroke-dashoffset": Number(arc.dataset.arc) }, duration: 1.1, ease: "power2.out" }, 0.3);
  });

  const items = panel.querySelectorAll<HTMLElement>("[data-list-item]");
  if (items.length) tl.from(items, { opacity: 0, x: -8, duration: 0.4, ease: "power2.out", stagger: 0.06 }, 0.3);
}
