"use client";

import { useEffect } from "react";
import { site } from "@/content/site";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { applyRun, pipelineRun } from "./jenkins/runState";

/** Never pin higher than this (just below the fixed navbar), px */
const PIN_TOP = 84;
/** Scroll distance (px) the job stays pinned while the stages run */
const RUN_SCROLL = 760;
const TRIGGER_ID = "pipeline-run";

/**
 * 4b. Desktop (≥768px) with motion: pin the Jenkins job and run its stages one by one as you scroll
 * (queued → running → passed; the current stage stays running; the parallel branch runs with its
 * stage). Only `pipelineRun.t` changes; applyRun() derives every status from it (see runState).
 * Smaller screens with motion: the job fades up. Reduced motion: final state, still.
 */
export function PipelineScroll() {
  useEffect(() => {
    const job = document.querySelector<HTMLElement>("[data-jenkins]");
    if (!job) return;
    const slots = site.experience.length;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      // Never two run triggers (e.g. after a hot reload): they would fight over the states.
      ScrollTrigger.getById(TRIGGER_ID)?.kill();
      const set = (p: number) => {
        pipelineRun.t = p * slots;
        applyRun(job);
      };
      set(0);

      const pinTop = () => Math.max(PIN_TOP, Math.round((window.innerHeight - job.offsetHeight) / 2));
      const st = ScrollTrigger.create({
        id: TRIGGER_ID,
        trigger: job,
        start: () => `top ${pinTop()}px`,
        end: `+=${RUN_SCROLL}`,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => set(self.progress),
        // Exact end states when scrolling quickly past either end.
        onLeave: () => set(1),
        onLeaveBack: () => set(0),
      });

      return () => {
        st.kill();
        pipelineRun.t = null;
        applyRun(job);
      };
    });

    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        job,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: job, start: "top 85%", toggleActions: "play none none reverse" } },
      );
    });

    return () => mm.revert();
  }, []);

  return null;
}
