"use client";

import { useRef, useSyncExternalStore } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { durationSince } from "@/lib/duration";
import { SHOW_TODOS } from "@/lib/todo";
import type { Milestone } from "@/types/content";
import type { PipelineStage } from "./model";
import { useBuildNumber } from "./buildNumber";
import { useRunSync } from "./useRunSync";

// Build date = today, read on the client only (no Date during prerender; server renders "").
const noopSubscribe = () => () => {};
const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
const useToday = () => useSyncExternalStore(noopSubscribe, today, () => "");

/** A stage's duration: fixed in site.ts, or (current role) from its `since` month to today, client only. */
function useDuration(m: Milestone | null) {
  return useSyncExternalStore(
    noopSubscribe,
    () => (m?.since ? durationSince(m.since, new Date()) : m?.duration) ?? null,
    () => m?.duration ?? null,
  );
}

/** Dev-only tooltip on stages whose duration is still missing in site.ts. */
const todoTitle = (duration: string | null) => (duration || !SHOW_TODOS ? undefined : "Duration: TODO in site.ts");

function DurationCell({ stage }: { stage: PipelineStage }) {
  const duration = useDuration(stage.milestone);
  return (
    // nowrap: next to the build console (lg) the cells are narrower; the row height must not change.
    <td className="truncate text-center text-muted" title={todoTitle(duration)}>
      {duration ?? "—"}
    </td>
  );
}

function PassedDuration({ stage }: { stage: PipelineStage }) {
  return <>{useDuration(stage.milestone) ?? "—"}</>;
}

/**
 * Classic Jenkins Stage View (desktop only): stage headers, an "Average stage times" row, then the
 * build row with a build-info cell (#n of the latest build + date) and one cell per stage — light green with the
 * duration when passed, animated blue stripes while running, plain grey while queued.
 */
export function StageView({
  stages,
  onOpen,
  covered = false,
}: {
  stages: PipelineStage[];
  onOpen: (s: PipelineStage) => void;
  /** The build console sits on top of it (md–lg only; lg+ shows them side by side) */
  covered?: boolean;
}) {
  const build = useBuildNumber();
  const date = useToday();
  const ref = useRef<HTMLDivElement>(null);
  // The date hydrating (and any other re-render) resets the cells to their final status.
  useRunSync(ref);
  return (
    <div ref={ref} className={cn("hidden border-t border-line px-5 py-3 md:block", covered && "md:max-lg:invisible")}>
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
              <DurationCell key={s.id} stage={s} />
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
                  onClick={() => onOpen(s)}
                  // Same consoles as the graph nodes above: one tab stop per stage is enough.
                  tabIndex={-1}
                  aria-label={`${s.label}: open console output`}
                  className={cn(
                    // data-* (not group-data-*): this element itself carries data-status.
                    "relative h-11 w-full overflow-hidden rounded-md border transition-transform duration-150 hover:ring-2 hover:ring-cyan/50 focus-visible:ring-2 focus-visible:ring-cyan active:scale-[0.97] motion-reduce:transform-none",
                    // Jenkins conventions, dark-theme versions in the site palette.
                    "data-[status=queued]:border-line-strong data-[status=queued]:bg-white/[0.04] data-[status=queued]:text-muted",
                    "data-[status=passed]:border-success/35 data-[status=passed]:bg-success/[0.14] data-[status=passed]:text-[#86efac]",
                    "data-[status=running]:border-[#4a90e2]/50 data-[status=running]:text-[#93c5fd]",
                  )}
                >
                  {/* Classic "in progress" stripes on their own layer, one stripe period (28.28px)
                      wider than the cell: JenkinsJob slides it by transform (compositor-only). */}
                  <span
                    data-stripes
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 -left-[28.28px] hidden bg-[repeating-linear-gradient(45deg,rgb(74_144_226/0.24)_0_10px,rgb(74_144_226/0.1)_10px_20px)] [[data-status=running]>&]:block"
                  />
                  <span className="relative hidden [[data-status=passed]>&]:inline">
                    <PassedDuration stage={s} />
                  </span>
                  <span className="relative hidden [[data-status=running]>&]:inline">in progress</span>
                  <span className="relative hidden [[data-status=queued]>&]:inline">queued</span>
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
