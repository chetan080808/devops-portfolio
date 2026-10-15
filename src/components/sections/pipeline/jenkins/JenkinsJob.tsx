"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { PointerText } from "@/components/ui/PointerText";
import { ScrollTrigger } from "@/lib/gsap";
import { BuildConsole } from "./BuildConsole";
import { ConsolePanel } from "./ConsolePanel";
import { StageGraph } from "./StageGraph";
import { StageView } from "./StageView";
import { buildStages, jobRunning, type PipelineStage } from "./model";
import { useRunSync } from "./useRunSync";

/*
 * Single source of truth: every stage's state lives in `data-status` ("queued" | "running" |
 * "passed") on each element tagged `data-stage-id` (graph nodes AND table cells), and the header
 * count is recomputed from the same states. PipelineScroll drives them while the job is pinned;
 * server HTML carries the final state. Variant classes are written out in full on purpose:
 * Tailwind only generates classes it finds literally in the source.
 */

/** Jenkins-style job view of the career pipeline (Blue Ocean graph + classic Stage View). */
export function JenkinsJob() {
  const stages = useMemo(() => buildStages(), []);
  const [open, setOpen] = useState<PipelineStage | null>(null);
  const close = useCallback(() => setOpen(null), [setOpen]);
  const running = jobRunning();
  const mainStages = stages.filter((s) => !s.parallelTo);
  const passed = mainStages.filter((s) => s.final === "passed").length;
  const ref = useRef<HTMLDivElement>(null);

  // Build Now: `build` keys a fresh console per build; the console stays open after the run.
  const [build, setBuild] = useState(0);
  const [building, setBuilding] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const buildNowRef = useRef<HTMLButtonElement>(null);
  const startBuild = () => {
    if (building) return;
    setBuild((b) => b + 1);
    setBuilding(true);
    setConsoleOpen(true);
  };
  const buildDone = useCallback(() => setBuilding(false), []);
  const closeConsole = useCallback(() => {
    setConsoleOpen(false);
    setBuilding(false);
    buildNowRef.current?.focus({ preventScroll: true });
  }, []);

  // Phones: the console sits in the flow below the stage list and changes the page height, so
  // every ScrollTrigger below must re-measure. (md+: it overlays a fixed-size area; no refresh —
  // a refresh while the job is pinned would jump the page.)
  const consoleShown = useRef(false);
  useEffect(() => {
    if (!consoleOpen && !consoleShown.current) return;
    consoleShown.current = true;
    if (window.matchMedia("(max-width: 767px)").matches) ScrollTrigger.refresh();
  }, [consoleOpen]);

  // Re-derive every status after each render (React would otherwise show the final states).
  useRunSync(ref);

  // Classic Stage View "in progress" stripes, animated (WAAPI: no extra CSS keyframes needed).
  // Transform, not background-position: a looping background-position repaints every frame.
  // Hidden layers (cells that aren't running) cost nothing.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anims = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-stripes]") ?? []).map((el) =>
      el.animate([{ transform: "translateX(0)" }, { transform: "translateX(28.28px)" }], { duration: 900, iterations: Infinity }),
    );
    return () => anims.forEach((a) => a.cancel());
  }, []);

  return (
    <div ref={ref} data-jenkins className="glass group/job overflow-hidden rounded-2xl">
      {/* Job header */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-b border-line px-4 py-2.5 sm:px-5 sm:py-3">
        <p className="font-mono text-[0.8rem] text-fg sm:text-sm">
          {site.pipeline.job} <span className="text-faint">»</span> {site.pipeline.branch}{" "}
          <span className="text-faint">·</span> <span className="text-cyan">Build #{site.experience.length}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span id="build-now-hint" className="text-[0.72rem] text-faint max-sm:order-last">
            {site.pipeline.buildHint}
          </span>
          <p className="flex items-center gap-2 font-mono text-xs">
            {running ? (
              <>
                <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-[#4a90e2] border-t-transparent" />
                <span className="text-[#6aa9f0]">In progress</span>
              </>
            ) : (
              <span className="text-success">✓ Success</span>
            )}
            <span className="text-muted">
              · <span data-passed-count>{`${passed}/${mainStages.length} stages passed`}</span>
            </span>
          </p>
          <button
            ref={buildNowRef}
            type="button"
            onClick={startBuild}
            // aria-disabled, not disabled: a disabled button would drop keyboard focus mid-build.
            aria-disabled={building}
            aria-describedby="build-now-hint"
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line-strong bg-white/[0.04] px-3 font-mono text-xs text-fg sm:min-h-8",
              "transition-[color,border-color,transform] duration-150 hover:border-cyan/50 hover:text-cyan focus-visible:ring-2 focus-visible:ring-cyan active:scale-95 motion-reduce:transform-none",
              "aria-disabled:cursor-progress aria-disabled:text-muted aria-disabled:hover:border-line-strong aria-disabled:active:scale-100",
            )}
          >
            {building ? (
              <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-[#4a90e2] border-t-transparent" />
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3 text-success">
                <path d="M4 2.5 L13 8 L4 13.5 Z" fill="currentColor" />
              </svg>
            )}
            {building ? "Building…" : "Build Now"}
          </button>
        </div>
      </div>

      {/* Build console: phones below the stage list (in the flow); md–lg over the Stage View and
          the graph's branch row (from 110 px: the main row's labels end at 106; ~8.4 log lines);
          lg+ a right-hand column next to graph + Stage View. md+ never changes the job's height (the job may be pinned).
          flow-root: the graph's top margin must stay inside (it collapsed through, so the console
          started 20 px low). */}
      <div className="relative flow-root">
        <div className={cn(consoleOpen && "lg:pr-[min(36%,26rem)]")}>
          <StageGraph stages={stages} onOpen={setOpen} />
          <StageView stages={stages} onOpen={setOpen} covered={consoleOpen} />
        </div>
        {consoleOpen && (
          <BuildConsole
            key={build}
            stages={stages}
            onDone={buildDone}
            onClose={closeConsole}
            className="h-60 border-t border-line md:absolute md:inset-x-0 md:top-[110px] md:bottom-0 md:h-auto lg:top-0 lg:left-auto lg:w-[min(36%,26rem)] lg:border-t-0 lg:border-l"
          />
        )}
      </div>

      <ConsolePanel stage={open} onClose={close} />
    </div>
  );
}

/** Plain-language name of a stage (site.ts), e.g. "Education" for the Build stage. */
const plainLabel = (stage: PipelineStage) => stage.milestone?.plainTitle ?? site.pipeline.parallel.plainLabel;

/** Legend for the stage nodes + "Click / Tap a stage for details". "Not started" only while a stage is queued. */
export function StageLegend({ className }: { className?: string }) {
  const { legend, stageHint } = site.pipeline;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.72rem] text-muted", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="flex size-3.5 items-center justify-center rounded-full bg-[#2fa84f]">
          <svg viewBox="0 0 16 16" className="size-2.5 text-white">
            <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {legend.done}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3.5 rounded-full bg-[#4a90e2]" />
        {legend.current}
      </span>
      <span className="hidden items-center gap-1.5 group-data-[queued]/job:inline-flex">
        <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-[#8b95a8]" />
        {legend.queued}
      </span>
      <span className="text-faint">
        <PointerText text={stageHint} />
      </span>
    </p>
  );
}

/** Blue Ocean node: solid green + white check (passed), blue + spinner (running), grey ring (queued). */
export function StageNode({
  stage,
  onOpen,
  className,
  style,
  layout = "column",
}: {
  stage: PipelineStage;
  onOpen: (s: PipelineStage) => void;
  className?: string;
  style?: CSSProperties;
  layout?: "column" | "row";
}) {
  return (
    <button
      type="button"
      data-stage-id={stage.id}
      data-status={stage.final}
      data-final={stage.final}
      data-slot={stage.slot}
      {...(stage.parallelTo ? {} : { "data-main": "" })}
      onClick={() => onOpen(stage)}
      aria-label={`${plainLabel(stage)} (${stage.label}): open details`}
      style={style}
      className={cn(
        "group/st flex items-center gap-3 rounded-lg",
        layout === "column" ? "flex-col gap-1.5 text-center" : "text-left",
        className,
      )}
    >
      <span
        className={cn(
          "relative flex size-7 shrink-0 items-center justify-center rounded-full border-2",
          "group-data-[status=queued]/st:border-[#8b95a8] group-data-[status=queued]/st:bg-bg",
          "group-data-[status=passed]/st:border-[#2fa84f] group-data-[status=passed]/st:bg-[#2fa84f]",
          "group-data-[status=running]/st:border-[#4a90e2] group-data-[status=running]/st:bg-[#4a90e2]",
          "transition-transform duration-150 group-hover/st:ring-2 group-hover/st:ring-cyan/50 group-focus-visible/st:ring-2 group-focus-visible/st:ring-cyan",
          "group-active/st:scale-90 motion-reduce:transform-none",
        )}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="hidden size-3.5 text-white group-data-[status=passed]/st:block">
          <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span aria-hidden="true" className="hidden size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent group-data-[status=running]/st:block" />
      </span>
      {/* Plain step name first; the Jenkins stage name is the small mono label under it. */}
      <span className="min-w-0">
        <span
          title={stage.milestone?.title}
          className={cn("block text-[0.8rem] leading-snug font-medium text-fg", layout === "column" && "mx-auto line-clamp-2 max-w-[10.5rem]")}
        >
          {plainLabel(stage)}
        </span>
        <span className="block font-mono text-[0.68rem] text-muted">
          {stage.milestone ? stage.milestone.stage : `parallel · ${site.pipeline.parallel.jobs.length} jobs`}
        </span>
      </span>
    </button>
  );
}
