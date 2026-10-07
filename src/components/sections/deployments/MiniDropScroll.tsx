"use client";

import { useEffect } from "react";
import { site } from "@/content/site";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { miniDropProgress, scrollStory } from "@/lib/scrollStory";

/**
 * 4a scroll driver. Desktop with motion: one scrubbed ScrollTrigger from "Deployments enters"
 * to "cards well in view" feeds scrollStory.drop (the 3D minis read it every frame). Everyone:
 * cards fade/slide in as they enter (reduced motion: they're simply there).
 */
export function MiniDropScroll() {
  useEffect(() => {
    const mm = gsap.matchMedia();
    const n = site.projects.length;

    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-mini-slot]"));
      ScrollTrigger.create({
        trigger: "#deployments",
        start: "top bottom",
        endTrigger: "[data-project-grid]",
        end: "top 58%",
        scrub: 0.8,
        onUpdate: (self) => {
          scrollStory.drop = self.progress;
          slots.forEach((s, i) => {
            const landed = miniDropProgress(self.progress, i, n) >= 0.98;
            if ((s.dataset.landed === "true") !== landed) s.dataset.landed = String(landed);
          });
        },
      });
      return () => {
        scrollStory.drop = 0;
        slots.forEach((s) => delete s.dataset.landed);
      };
    });

    // Graceful version for every size: cards fade up as they enter.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // fromTo, not from: `from` captures the current state as its end, which under StrictMode's
      // double mount can already be the hidden state.
      gsap.fromTo("[data-project-grid] > article", { opacity: 0, y: 24 }, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: "[data-project-grid]", start: "top 85%", toggleActions: "play none none reverse" },
      });
    });

    return () => mm.revert();
  }, []);

  return null;
}
