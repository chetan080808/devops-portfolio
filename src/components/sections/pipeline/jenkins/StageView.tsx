"use client";

import { useRef, useSyncExternalStore } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import type { PipelineStage } from "./model";
import { useRunSync } from "./useRunSync";

// Build date = today, read on the client only (no Date during prerender; server renders "").
const noopSubscribe = () => () => {};
const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
const useToday = () => useSyncExternalStore(noopSubscribe, today, () => "");

/**
 * Classic Jenkins Stage View (desktop only): stage headers, an "Average stage times" row, then the
 * build row with a build-info cell (#n + date) and one cell per stage — light green with the
 * duration when passed, animated blue stripes while running, plain grey while queued.
 */
export function StageView({ stages, onOpen }: { stages: PipelineStage[]; onOpen: (s: PipelineStage) => void }) {
  const build = site.experience.length;
  const date = useToday();
  const ref = useRef<HTMLDivElement>(null);
  // The date hydrating (and any other re-render) resets the cells to their final status.
  useRunSync(ref);
  return (
    <div ref={ref} className="hidden border-t border-line px-5 py-3 md:block">
      <table className="w-full table-fixed border-separate border-spacing-x-1 border-spacing-y-1 font-mono text-[0.72rem]">
        <caption className="sr-only">Stage View</caption>
        <thead>
          <tr>
            <th scope="col" className="w-36" />
            {stages.map((s) => (
              <th key={s.id} scope="col" className="truncate pb-1 text-center font-normal text-muted">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="text-left font-normal text-muted">
              Average stage times:
            </th>
            {stages.map((s) => (
              <td key={s.id} className="text-center text-muted" title={s.milestone?.duration ? undefined : "Duration: TODO in site.ts"}>
                {s.milestone?.duration ?? "—"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="text-left font-normal">
              <span className="flex h-11 flex-col justify-center rounded-md border border-line-strong bg-white/[0.04] px-2.5">
                <span className="text-fg">
                  <span className="text-cyan">#{build}</span> · {site.pipeline.branch}
                </span>
                <span className="text-[0.66rem] text-muted">{date || " "}</span>
              </span>
            </th>
            {stages.map((s) => (
              <td key={s.id}>
                <button
                  type="button"
                  data-stage-id={s.id}
                  data-status={s.final}
                  data-final={s.final}
                  data-slot={s.slot}
                  data-stripes
                  onClick={() => onOpen(s)}
                  aria-label={`${s.label}: open console output`}
                  title={s.milestone?.duration ? undefined : "Duration: TODO in site.ts"}
                  className={cn(
                    // data-* (not group-data-*): this element itself carries data-status.
                    "h-11 w-full rounded-md border hover:ring-2 hover:ring-cyan/50 focus-visible:ring-2 focus-visible:ring-cyan",
                    // Jenkins conventions, dark-theme versions in the site palette.
                    "data-[status=queued]:border-line-strong data-[status=queued]:bg-white/[0.04] data-[status=queued]:text-muted",
                    "data-[status=passed]:border-success/35 data-[status=passed]:bg-success/[0.14] data-[status=passed]:text-[#86efac]",
                    // Classic "in progress" stripes; JenkinsJob animates background-position (WAAPI).
                    "data-[status=running]:border-[#4a90e2]/50 data-[status=running]:bg-[repeating-linear-gradient(45deg,rgb(74_144_226/0.24)_0_10px,rgb(74_144_226/0.1)_10px_20px)] data-[status=running]:text-[#93c5fd]",
                  )}
                >
                  <span className="hidden [[data-status=passed]>&]:inline">{s.milestone?.duration ?? "—"}</span>
                  <span className="hidden [[data-status=running]>&]:inline">in progress</span>
                  <span className="hidden [[data-status=queued]>&]:inline">queued</span>
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
