import type { Project } from "@/types/content";
import { accentBg, accentText, statusAccent } from "@/lib/accent";
import { cn } from "@/lib/cn";

/**
 * The bay each project's mini container lands in: the card's main visual. On desktop (motion
 * allowed) the 3D mini drops in from the whale (MiniDrop) and this illustration stays hidden;
 * everywhere else it shows, and on phones it drops into the bay itself (MobileLanding). The card's
 * `data-landed` styles the bay.
 */
export function MiniSlot({ index, status }: { index: number; status: Project["status"] }) {
  return (
    <div
      data-mini-slot={index}
      aria-hidden="true"
      className="relative mt-4 h-24 overflow-hidden rounded-xl border border-dashed border-line-strong bg-white/[0.015] transition-colors duration-500 md:mt-5 md:h-28 group-data-[landed=true]/card:border-solid group-data-[landed=true]/card:border-cyan/30 group-data-[landed=true]/card:bg-cyan/[0.03]"
    >
      {/* Landing pad: faint perspective grid under the container */}
      <svg viewBox="0 0 320 112" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-60">
        <g stroke="#22d3ee" strokeOpacity="0.09" strokeWidth="1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <line key={i} x1={160 + (i - 4) * 18} y1="44" x2={160 + (i - 4) * 70} y2="112" />
          ))}
          {[58, 74, 94].map((y) => (
            <line key={y} x1="0" y1={y} x2="320" y2={y} />
          ))}
        </g>
      </svg>
      <span className="absolute top-2 left-3 font-mono text-[0.62rem] text-faint">
        bay-{String(index + 1).padStart(2, "0")}
      </span>
      <span className="absolute top-2 right-3 font-mono text-[0.62rem] text-faint group-data-[landed=false]/card:hidden">
        mounted
      </span>
      <span className="absolute top-2 right-3 hidden font-mono text-[0.62rem] text-warning group-data-[landed=false]/card:inline">
        awaiting container…
      </span>
      {/* Landing flash (MobileLanding fades it in and out) */}
      <span data-bay-flash className="absolute inset-0 bg-cyan/10 opacity-0" />

      {/* 2D container: mobile, tablet, reduced motion, no WebGL. Drops in on phones. */}
      <div
        data-mini-art
        className="absolute inset-x-0 bottom-1 mx-auto h-[78%] w-fit transition-opacity duration-500 [html[data-minis=webgl]_&]:opacity-0"
      >
        {/* "Living" container: lifts and turns a little on hover (desktop) or press / tap (touch).
            Its own wrapper: MiniDropScroll animates [data-mini-art]'s transform on phones. */}
        <div className="relative h-full w-fit transition-transform duration-500 ease-premium group-hover/card:-translate-y-1.5 group-hover/card:-rotate-2 group-active/card:-translate-y-1.5 group-active/card:-rotate-2 motion-reduce:transform-none">
          <svg viewBox="0 0 168 92" className="h-full w-auto overflow-visible" role="presentation">
            <defs>
              <filter id={`neon-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* contact shadow */}
            <ellipse cx="84" cy="86" rx="58" ry="5" fill="#000" opacity="0.45" />
            <g strokeLinejoin="round">
              {/* faces: top, left (long side, corrugated), right (doors) */}
              <path d="M24 30 L96 10 L144 26 L72 46 Z" fill="#2e3552" />
              <path d="M24 30 L24 64 L72 82 L72 46 Z" fill="#232a45" />
              <path d="M144 26 L144 60 L72 82 L72 46 Z" fill="#1b2138" />
              {/* corrugation on the long side */}
              <g stroke="#7d89a3" strokeOpacity="0.55" strokeWidth="0.9">
                {[32, 40, 48, 56, 64].map((x, i) => (
                  <line key={x} x1={x} y1={33 + i * 2.9} x2={x} y2={66 + i * 2.9} />
                ))}
              </g>
              {/* doors: violet seam + lock bars */}
              <g stroke="#8b5cf6" strokeWidth="1.4" filter={`url(#neon-${index})`}>
                <line x1="108" y1="57" x2="108" y2="71" />
                <line x1="99" y1="60" x2="99" y2="74" />
                <line x1="117" y1="54" x2="117" y2="68" />
              </g>
              {/* neon edge rails */}
              <g fill="none" stroke="#22d3ee" strokeWidth="1.6" filter={`url(#neon-${index})`}>
                <path d="M24 30 L96 10 L144 26 L72 46 Z" />
                <path d="M24 30 L24 64 L72 82 L144 60 L144 26" />
                <path d="M72 46 L72 82" />
              </g>
            </g>
          </svg>
          {/* Status LED on the roof corner, in the status colour: blinks once the container has
              landed (Pending: off). Reduced motion: steady (the global rule stops the loop). */}
          <span
            className={cn(
              "absolute top-[15%] right-[14%] size-1.5 rounded-full shadow-[0_0_6px_1px_currentColor] group-data-[landed=false]/card:opacity-0",
              "group-data-[landed=true]/card:animate-led",
              accentBg[statusAccent[status]],
              accentText[statusAccent[status]],
            )}
          />
        </div>
      </div>
    </div>
  );
}
