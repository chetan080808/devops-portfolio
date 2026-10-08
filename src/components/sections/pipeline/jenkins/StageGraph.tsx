"use client";

import { useEffect, useRef, useState } from "react";
import { StageNode } from "./JenkinsJob";
import type { PipelineStage } from "./model";

/** Node radius, main / branch row centres, label room — px */
const R = 14;
const Y1 = 26;
const Y2 = 108;
const HEIGHT = 168;
/** Corner radius of the fork / rejoin connectors */
const CORNER = 12;

/**
 * Blue Ocean stage graph. Desktop: lines in an SVG BEHIND the nodes, stopping at each node's edge;
 * a parallel branch forks off the main line after the previous stage into a second row (same
 * column as its stage) and rejoins before the next one, with rounded connectors. Mobile: a simple
 * vertical list with the branch indented.
 */
export function StageGraph({ stages, onOpen }: { stages: PipelineStage[]; onOpen: (s: PipelineStage) => void }) {
  const main = stages.filter((s) => !s.parallelTo);
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const col = width / Math.max(1, main.length);
  const x = (i: number) => col * (i + 0.5);

  const lines: string[] = [];
  if (width > 0) {
    for (let i = 0; i < main.length - 1; i++) lines.push(`M ${x(i) + R} ${Y1} H ${x(i + 1) - R}`);
    main.forEach((stage, i) => {
      if (!stages.some((s) => s.parallelTo === stage.id)) return;
      const xd = x(i);
      if (i > 0) {
        // fork: off the main line in the gap before the stage (clear of every label), down, then
        // into the branch node
        const xs = x(i) - col / 2 - CORNER;
        lines.push(
          `M ${xs} ${Y1} Q ${xs + CORNER} ${Y1} ${xs + CORNER} ${Y1 + CORNER} V ${Y2 - CORNER} Q ${xs + CORNER} ${Y2} ${xs + 2 * CORNER} ${Y2} H ${xd - R}`,
        );
      }
      if (i < main.length - 1) {
        // rejoin: out of the branch node, up, back onto the main line in the gap after the stage
        const xj = x(i) + col / 2 + CORNER;
        lines.push(
          `M ${xd + R} ${Y2} H ${xj - 2 * CORNER} Q ${xj - CORNER} ${Y2} ${xj - CORNER} ${Y2 - CORNER} V ${Y1 + CORNER} Q ${xj - CORNER} ${Y1} ${xj} ${Y1}`,
        );
      }
    });
  }

  return (
    <>
      {/* Desktop */}
      <div ref={ref} className="relative mx-5 mt-5 mb-3 hidden md:block" style={{ height: HEIGHT }}>
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" fill="none">
          {lines.map((d, i) => (
            <path key={i} d={d} stroke="#5b6478" strokeWidth="2" strokeLinecap="round" />
          ))}
        </svg>
        {width > 0 &&
          main.map((stage, i) => {
            const branch = stages.find((s) => s.parallelTo === stage.id);
            return (
              <div key={stage.id}>
                <StageNode
                  stage={stage}
                  onOpen={onOpen}
                  className="absolute"
                  // Node circle centred on (x, Y1); the label hangs below it.
                  {...{ style: { left: x(i) - col / 2, top: Y1 - R, width: col } }}
                />
                {branch && (
                  <StageNode stage={branch} onOpen={onOpen} className="absolute" {...{ style: { left: x(i) - col / 2, top: Y2 - R, width: col } }} />
                )}
              </div>
            );
          })}
      </div>

      {/* Mobile */}
      <ol className="relative space-y-4 px-5 py-5 md:hidden">
        <span aria-hidden="true" className="absolute top-8 bottom-8 left-[2.15rem] w-0.5 bg-[#5b6478]" />
        {main.map((stage) => {
          const branch = stages.find((s) => s.parallelTo === stage.id);
          return (
            <li key={stage.id} className="relative space-y-3">
              <StageNode stage={stage} onOpen={onOpen} layout="row" />
              {branch && (
                <div className="ml-10 flex items-center gap-2">
                  <span className="font-mono text-[0.6rem] tracking-wider text-muted uppercase">parallel</span>
                  <StageNode stage={branch} onOpen={onOpen} layout="row" />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
