"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { hireMe } from "@/lib/hireMe";

/** Swim time across the section (ms): phones are narrower, so a little quicker */
const SWIM_MS = { phone: 5600, desktop: 7600 };
/** Reduced motion: fades in and out in place instead (ms) */
const STILL_MS = 2600;

/**
 * `sudo hire-me`: a small original whale (low-poly, carrying three containers, like the hero's)
 * swims across the Contact section, through the terminal's screen. Transform/opacity only
 * (WAAPI), pointer-events none, clipped to the section. Reduced motion: fades in and out in
 * place. Mount inside the section (it fills the nearest positioned ancestor).
 */
export function HireMeWhale() {
  const layer = useRef<HTMLDivElement>(null);
  const whale = useRef<HTMLDivElement>(null);
  const tail = useRef<SVGGElement>(null);
  const [run, setRun] = useState(0);

  useEffect(() => hireMe.subscribe(() => setRun((r) => r + 1)), []);

  useEffect(() => {
    const box = layer.current;
    const el = whale.current;
    if (!run || !box || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const area = box.getBoundingClientRect();
    const term = box.parentElement?.querySelector<HTMLElement>("[data-terminal]")?.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // Lane: through the upper part of the terminal's screen (the visitor is looking at it)
    const y = term ? term.top - area.top + term.height * 0.32 - h / 2 : area.height * 0.4;
    el.style.visibility = "visible";

    const anims: Animation[] = [];
    if (reduce) {
      const x = (term ? term.left - area.left + term.width / 2 : area.width / 2) - w / 2;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      anims.push(el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], STILL_MS));
    } else {
      const from = -w - 16;
      const to = area.width + 16;
      const at = (f: number, dy: number, rot: number) => ({
        transform: `translate3d(${from + (to - from) * f}px, ${y + dy}px, 0) rotate(${rot}deg)`,
        offset: f,
      });
      anims.push(
        el.animate([at(0, 10, -4), at(0.25, -6, 2), at(0.5, 6, -2), at(0.75, -6, 2), at(1, 4, 0)], {
          duration: phone ? SWIM_MS.phone : SWIM_MS.desktop,
          easing: "cubic-bezier(.45,.05,.55,.95)",
        }),
      );
      if (tail.current) {
        anims.push(
          tail.current.animate([{ transform: "rotate(-14deg)" }, { transform: "rotate(14deg)" }], {
            duration: 520,
            iterations: Infinity,
            direction: "alternate",
            easing: "ease-in-out",
          }),
        );
      }
    }
    anims[0].onfinish = () => {
      el.style.visibility = "hidden";
      anims.forEach((a) => a.cancel());
    };
    return () => anims.forEach((a) => a.cancel());
  }, [run]);

  return (
    <div ref={layer} aria-hidden={run ? undefined : true} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <p role="status" className="sr-only">
        {run ? site.terminal.hireMeWhale : ""}
      </p>
      <div ref={whale} style={{ visibility: "hidden" }} className="absolute top-0 left-0 w-24 will-change-transform md:w-36">
        <svg viewBox="0 0 120 60" className="h-auto w-full overflow-visible" aria-hidden="true">
          <defs>
            <filter id="hire-glow" x="-20%" y="-30%" width="140%" height="160%">
              <feGaussianBlur stdDeviation="1.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Tail flukes (horizontal, seen from the side: a thin paddle), flicking about the tail stock */}
          <g ref={tail} style={{ transformBox: "fill-box", transformOrigin: "100% 50%" }}>
            <path d="M23 29 L13 25.5 L1 24 L7 28.5 L1 33 L13 31.5 Z" fill="#1c1f33" stroke="#22d3ee" strokeWidth="1.2" strokeLinejoin="round" filter="url(#hire-glow)" />
          </g>
          {/* Body (faceted), belly line, flipper, eye */}
          <path
            d="M21 29 L36 21 L60 17 L88 17 L106 20 L115 26 L115 34 L105 41 L84 45 L56 45 L36 39 Z"
            fill="#1c1f33"
            stroke="#22d3ee"
            strokeWidth="1.3"
            strokeLinejoin="round"
            filter="url(#hire-glow)"
          />
          <path d="M36 21 L58 30 L88 17 M58 30 L56 45 M58 30 L84 45 M88 17 L100 31 L84 45 M100 31 L115 30" fill="none" stroke="#2b3150" strokeWidth="1" />
          {/* Mouth line + violet belly, long flipper, eye */}
          <path d="M114 33 L97 36.5" fill="none" stroke="#22d3ee" strokeWidth="1" strokeLinecap="round" />
          <path d="M38 39.5 L60 42 L86 41 L104 37" fill="none" stroke="#8b5cf6" strokeWidth="1.2" filter="url(#hire-glow)" />
          <path d="M72 43 L58 56 L82 44 Z" fill="#232a45" stroke="#22d3ee" strokeWidth="1" strokeLinejoin="round" />
          <circle cx="101" cy="29.5" r="1.5" fill="#e6f7ff" />
          {/* Cargo: three containers on the back */}
          <g strokeWidth="1" strokeLinejoin="round" filter="url(#hire-glow)">
            <rect x="46" y="10" width="12" height="7.5" rx="0.6" fill="#3a4160" stroke="#22d3ee" />
            <rect x="60" y="9.5" width="12" height="7.5" rx="0.6" fill="#3a4160" stroke="#8b5cf6" />
            <rect x="74" y="10.5" width="12" height="7.5" rx="0.6" fill="#3a4160" stroke="#22d3ee" />
          </g>
        </svg>
      </div>
    </div>
  );
}
