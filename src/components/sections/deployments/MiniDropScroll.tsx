"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DROP_PIN_AT, miniDropProgress, scrollStory } from "@/lib/scrollStory";

/** Scroll distance (px) the cards stay pinned while the minis drop */
const DROP_SCROLL = 1500;

/**
 * 4a scroll driver.
 * Desktop with motion: `approach` runs from the first scroll in the hero to the pin (the whale
 * swims down above the cards, staying in view); then the cards pin while `drop` runs and each mini
 * lands in its bay in turn — the card flips from "Pending" to its real status with a flash.
 * All scrubbed, so fully reversible. Smaller screens: cards fade up. Reduced motion: nothing moves.
 */
export function MiniDropScroll() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const grid = document.querySelector<HTMLElement>("[data-project-grid]");
      const hero = document.getElementById("top");
      if (!grid || !hero) return;
      const cards = Array.from(grid.querySelectorAll<HTMLElement>(":scope > article"));
      const n = cards.length;
      const pinTop = () => `top ${Math.round(window.innerHeight * DROP_PIN_AT)}px`;

      const counter = document.querySelector<HTMLElement>("[data-running-count]");
      // The heading counter always matches the badges: running = landed cards whose status is Running.
      const recount = () => {
        if (!counter) return;
        const running = cards.filter((c) => c.dataset.landed === "true" && c.dataset.running === "true").length;
        const text = `${running}/${n} running`;
        if (counter.textContent !== text) counter.textContent = text;
      };
      const land = (p: number, animate: boolean) => {
        cards.forEach((card, i) => {
          const landed = miniDropProgress(p, i, n) >= 0.995;
          if ((card.dataset.landed === "true") === landed) return;
          card.dataset.landed = String(landed);
          if (landed && animate) {
            card.querySelector("[data-mini-slot]")?.animate(
              [
                { boxShadow: "0 0 0 0 rgb(34 211 238 / 0)", borderColor: "rgb(34 211 238 / 0.3)" },
                { boxShadow: "0 0 28px 4px rgb(34 211 238 / 0.55)", borderColor: "rgb(103 232 249 / 1)", offset: 0.25 },
                { boxShadow: "0 0 0 0 rgb(34 211 238 / 0)", borderColor: "rgb(34 211 238 / 0.3)" },
              ],
              { duration: 700, easing: "ease-out" },
            );
          }
        });
      };
      land(0, false);
      recount();

      // Never duplicates (e.g. after a hot reload): they would fight over the drop progress.
      ScrollTrigger.getById("drop-approach")?.kill();
      ScrollTrigger.getById("drop-pin")?.kill();
      ScrollTrigger.create({
        id: "drop-approach",
        trigger: hero,
        start: "top top",
        endTrigger: grid,
        end: pinTop,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => (scrollStory.approach = self.progress),
      });
      ScrollTrigger.create({
        id: "drop-pin",
        trigger: grid,
        start: pinTop,
        end: `+=${DROP_SCROLL}`,
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          scrollStory.drop = self.progress;
          land(self.progress, self.direction > 0);
          recount();
        },
      });

      return () => {
        scrollStory.approach = 0;
        scrollStory.drop = 0;
        cards.forEach((c) => (c.dataset.landed = "true"));
        recount();
      };
    });

    // Graceful version below desktop: cards fade up as they enter.
    mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        "[data-project-grid] > article",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: "[data-project-grid]", start: "top 85%", toggleActions: "play none none reverse" },
        },
      );
    });

    return () => mm.revert();
  }, []);

  return null;
}
