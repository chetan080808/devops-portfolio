"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ConsoleEnd, ConsoleLine } from "./ConsolePanel";
import { buildScript, scriptT, type PipelineStage } from "./model";
import { applyRun, pipelineRun, railScale } from "./runState";

/** Longest step the run advances per frame, ms: a hidden tab / long task pauses the build instead of dumping it. */
const MAX_STEP_MS = 50;

/**
 * Phones: the rail fill and the node centres of the stage list, measured once when the build
 * starts (only differences matter, so scrolling during the build doesn't change them).
 */
function phoneRail(job: HTMLElement | null) {
  if (!job || !window.matchMedia("(max-width: 767px)").matches) return null;
  const fill = job.querySelector<HTMLElement>("[data-run-fill]");
  const ys = Array.from(job.querySelectorAll<HTMLElement>("[data-run-row]")).map((row) => {
    const r = row.querySelector<HTMLElement>("[data-stage-id] > span")!.getBoundingClientRect();
    return r.top + r.height / 2;
  });
  return fill && ys.length > 1 ? { fill, ys } : null;
}

/**
 * Build Now: replays the whole run and streams its console log. One rAF loop drives everything:
 * `pipelineRun.t` → applyRun (statuses change a few times per run, attribute writes only), the
 * phone rail fill (transform), and the number of printed lines (React state, only when a line
 * appears). Reduced motion: the finished log and final states at once.
 * Remount (new `key`) for every build.
 */
export function BuildConsole({
  number,
  stages,
  onDone,
  onClose,
  className,
}: {
  /** Build number of this run */
  number: number;
  stages: PipelineStage[];
  onDone: () => void;
  onClose: () => void;
  className?: string;
}) {
  const script = useMemo(() => buildScript(stages, number), [stages, number]);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const job = ref.current?.closest<HTMLElement>("[data-jenkins]") ?? null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rail = reduce ? null : phoneRail(job);
    const setFill = (s: number) => {
      if (rail) rail.fill.style.transform = `scaleY(${s})`;
    };
    pipelineRun.manual = true;

    // Phones: bring the console into view (the button sits above the stage list).
    if (window.matchMedia("(max-width: 767px)").matches) {
      ref.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "instant" : "smooth" });
    }

    let ms = 0;
    let prev = performance.now();
    let printed = -1;
    let finished = false;
    let raf = 0;
    const finish = () => {
      finished = true;
      pipelineRun.t = null;
      applyRun(job);
      setFill(1);
      setShown(script.lines.length);
      setDone(true);
      onDone();
    };
    const tick = (now: number) => {
      ms += Math.min(now - prev, MAX_STEP_MS);
      prev = now;
      if (reduce || ms >= script.end) return finish();
      const t = scriptT(script, ms);
      pipelineRun.t = t;
      applyRun(job);
      setFill(rail ? railScale(rail.ys, t) : 0);
      let n = printed < 0 ? 0 : printed;
      while (n < script.lines.length && script.lines[n].at <= ms) n++;
      if (n !== printed) {
        printed = n;
        setShown(n);
      }
      raf = requestAnimationFrame(tick);
    };
    pipelineRun.t = -1;
    applyRun(job);
    setFill(0);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // Closed mid-run: show the real, final state.
      if (!finished) {
        pipelineRun.t = null;
        applyRun(job);
        setFill(1);
      }
    };
  }, [script, onDone]);

  // Follow the log as it streams (the console's own scroll box, never the page).
  useLayoutEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [shown, done]);

  const current = stages.find((s) => s.final === "running" && !s.parallelTo);
  return (
    <div ref={ref} className={cn("flex flex-col bg-[#070a12]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-1.5">
        <p className="truncate font-mono text-[0.72rem] text-muted">
          <span className="text-cyan">#{number}</span> » <span className="text-fg">Console Output</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close build console"
          className="relative shrink-0 rounded-md border border-line-strong px-2 py-0.5 font-mono text-[0.7rem] text-muted transition-[color,border-color,transform] before:absolute before:-inset-2 before:content-[''] hover:border-cyan/50 hover:text-cyan active:scale-95"
        >
          close
        </button>
      </div>
      <pre
        ref={logRef}
        tabIndex={0}
        aria-label="Build console log"
        className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-3 font-mono text-[0.72rem] leading-5 whitespace-pre-wrap text-muted"
      >
        {script.lines.slice(0, shown).map((l, i) => (
          <ConsoleLine key={i} line={l.line} />
        ))}
        {done ? <ConsoleEnd running={script.running} /> : <span aria-hidden="true" className="inline-block animate-blink text-cyan">▍</span>}
      </pre>
      <p role="status" className="sr-only">
        {done
          ? script.running && current
            ? `Build finished its run: ${current.label} is still running.`
            : "Finished: SUCCESS"
          : "Build started."}
      </p>
    </div>
  );
}
