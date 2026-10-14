"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/types/content";
import { cn } from "@/lib/cn";
import { ProjectCard } from "./ProjectCard";
import { InspectPanel } from "./InspectPanel";

/**
 * Phones: a horizontal swipe carousel with snap (each card ~84% wide, so the next one peeks in),
 * with dots under it. md+: the grid (desktop: the 3D minis drop into it, MiniDropScroll).
 */
export function ProjectGrid({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<Project | null>(null);
  const close = useCallback(() => setActive(null), []);
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  // Current card = the one whose centre is nearest the track's centre (only scrolls on phones).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const centre = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        Array.from(el.children).forEach((card, i) => {
          const c = card as HTMLElement;
          const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centre);
          if (d < bestDist) [best, bestDist] = [i, d];
        });
        setCurrent(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = (i: number) => {
    const card = track.current?.children[i] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <>
      <div
        ref={track}
        data-project-grid
        role="region"
        aria-roledescription="carousel"
        aria-label="Projects"
        className={cn(
          "grid gap-5 md:grid-cols-2 lg:grid-cols-3",
          // Phones: edge-to-edge swipe track with snap; scrollbar hidden (the dots show position).
          "max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:scroll-px-4 max-md:gap-3 max-md:overflow-x-auto max-md:overscroll-x-contain max-md:px-4 max-md:pb-1 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden",
          "max-md:[&>article]:w-[84%] max-md:[&>article]:shrink-0 max-md:[&>article]:snap-center",
          // Tablets (2 columns): an odd last card sits centred at card width, not alone on the left.
          "md:max-lg:[&>article:last-child:nth-child(odd)]:col-span-2 md:max-lg:[&>article:last-child:nth-child(odd)]:w-[calc(50%-0.625rem)] md:max-lg:[&>article:last-child:nth-child(odd)]:justify-self-center",
        )}
      >
        {projects.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} onInspect={setActive} />
        ))}
      </div>

      {projects.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 md:hidden">
          <div className="flex gap-1.5">
            {projects.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show project ${i + 1} of ${projects.length}: ${p.name}`}
                aria-current={i === current ? "true" : undefined}
                className="grid size-6 place-items-center"
              >
                <span
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === current ? "w-5 bg-cyan" : "w-1.5 bg-line-strong",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="font-mono text-[0.68rem] text-faint" aria-hidden="true">
            {current + 1} / {projects.length} · swipe
          </span>
        </div>
      )}
      <InspectPanel project={active} onClose={close} />
    </>
  );
}
