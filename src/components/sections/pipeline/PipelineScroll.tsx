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
 * Phones (<768px) with motion: no pin; the job fades up and each stage runs as its row crosses
 * a reading line (see runOnPhones). Reduced motion: final state, still.
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
      return runOnPhones(job);
    });

    return () => mm.revert();
  }, []);

  return null;
}

/** Phones: a row starts running when its node reaches this line (fraction of the viewport). */
const READ_LINE = 0.62;

/**
 * Phones: drive `pipelineRun.t` from where the stage rows are, not from a pin (pinning on phones
 * fights the browser's toolbar resize). Stage i runs while its node is between the reading line
 * and the next node reaching it; the green rail fill follows the same `t` (scaleY: transform only).
 * Rows are re-measured on every update (one rect per row, a handful of rows).
 */
function runOnPhones(job: HTMLElement) {
  const list = job.querySelector<HTMLElement>("[data-run-list]");
  const rail = list?.querySelector<HTMLElement>("[data-run-rail]");
  const fill = rail?.querySelector<HTMLElement>("[data-run-fill]");
  if (!list || !rail || !fill) return;
  // The main stage's node of each row (the first node: the parallel branch sits below it).
  const nodes = () =>
    Array.from(list.querySelectorAll<HTMLElement>("[data-run-row]")).map(
      (row) => row.querySelector<HTMLElement>("[data-stage-id] > span")!,
    );
  const centre = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.top + r.height / 2;
  };

  // Rail from the first to the last node centre (layout: only on refresh / resize).
  const placeRail = () => {
    const n = nodes();
    if (n.length < 2) return;
    const top = list.getBoundingClientRect().top;
    rail.style.top = `${centre(n[0]) - top}px`;
    rail.style.bottom = "auto";
    rail.style.height = `${centre(n[n.length - 1]) - centre(n[0])}px`;
  };

  const update = () => {
    const ys = nodes().map(centre);
    const line = window.innerHeight * READ_LINE;
    pipelineRun.t = runAt(ys, line);
    applyRun(job);
    // Fill reaches node i exactly when t = i (the node turns from queued to running).
    const span = ys[ys.length - 1] - ys[0];
    const reach = Math.min(Math.max(line, ys[0]), ys[ys.length - 1]) - ys[0];
    fill.style.transform = `scaleY(${span > 0 ? reach / span : 0})`;
  };

  ScrollTrigger.getById(TRIGGER_ID)?.kill();
  const st = ScrollTrigger.create({
    id: TRIGGER_ID,
    trigger: list,
    start: "top bottom",
    end: "bottom top",
    onUpdate: update,
    onToggle: update,
    onRefresh: () => {
      placeRail();
      update();
    },
  });
  placeRail();
  update();

  return () => {
    st.kill();
    pipelineRun.t = null;
    applyRun(job);
    rail.style.removeProperty("top");
    rail.style.removeProperty("bottom");
    rail.style.removeProperty("height");
    fill.style.removeProperty("transform");
  };
}

/**
 * Run position from the node centres `ys` (viewport px, top to bottom) and the reading line:
 * -1 before the first node reaches it (all queued), exactly i when node i reaches it (stage i
 * starts running), interpolated in between; past the last node it keeps counting by the last gap
 * up to i + 1 (a finished last stage then passes; the current one keeps running, see statusAt).
 */
export function runAt(ys: number[], line: number) {
  if (!ys.length || ys[0] > line) return -1;
  for (let i = 0; i < ys.length - 1; i++) {
    if (ys[i + 1] > line) return i + (line - ys[i]) / (ys[i + 1] - ys[i]);
  }
  const last = ys.length - 1;
  const gap = last > 0 ? ys[last] - ys[last - 1] : 1;
  return last + Math.min(1, (line - ys[last]) / gap);
}
