"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useChaosRun, useChaosTime } from "@/hooks/useChaos";
import { CHAOS, chaos, healedAt, killAt, podName, runDuration, victimPhase, type ChaosRun } from "@/lib/chaos";
import { cn } from "@/lib/cn";

type Tone = "cmd" | "fail" | "warn" | "ok";
interface LogLine {
  at: number;
  tone: Tone;
  text: string;
}

const toneClass: Record<Tone, string> = {
  cmd: "text-muted",
  fail: "text-danger",
  warn: "text-warning",
  ok: "text-success",
};

/** How long the log stays up after the cluster has healed (s). */
const LINGER = 3.2;

/** The run as kubectl-ish log lines, timed to the same timeline the 3D cluster plays. */
function logFor(run: ChaosRun): LogLine[] {
  const n = run.victims.length;
  const total = run.nodeCount;
  const lastDown = killAt(n - 1) + CHAOS.CRASH;
  return [
    { at: 0, tone: "cmd", text: `$ chaos-monkey --kill ${n} -n portfolio` },
    ...run.victims.map((v, i) => ({
      at: killAt(i) + 0.05,
      tone: "fail" as const,
      text: `[ FAIL ] pod/${podName(v)} CrashLoopBackOff`,
    })),
    { at: lastDown, tone: "warn", text: `[ WARN ] ${total - n}/${total} ready · rescheduling…` },
    ...run.victims.map((v, i) => ({ at: healedAt(i), tone: "ok" as const, text: `[ OK ] pod restarted · ${podName(v)}` })),
    {
      at: runDuration(run) + 0.02,
      tone: "ok",
      text: `[ OK ] self-healed in ${runDuration(run).toFixed(1)}s · ${total}/${total} ready`,
    },
  ];
}

/** Nodes of the run that are not healthy at `t`. */
export function nodesDown(run: ChaosRun, t: number) {
  return run.victims.filter((_, i) => victimPhase(i, t).phase !== "healthy").length;
}

/** "Release chaos monkey" button for the hero stage. Disabled while a run is in progress. */
export function ChaosMonkeyButton({ disabled, className }: { disabled?: boolean; className?: string }) {
  const run = useChaosRun();
  const busy = !!run;
  return (
    <button
      type="button"
      onClick={() => chaos.trigger()}
      disabled={disabled || busy}
      aria-describedby="chaos-hint"
      className={cn(
        // Neutral by default (it's an easter egg, not an error); red only when you reach for it.
        "pointer-events-auto rounded-md border border-line-strong px-2 py-0.5 font-mono text-[0.68rem] whitespace-nowrap text-faint",
        "transition-colors duration-300 hover:border-danger/60 hover:bg-danger/10 hover:text-danger",
        "focus-visible:border-danger focus-visible:bg-danger/10 focus-visible:text-danger",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:bg-transparent disabled:hover:text-faint",
        className,
      )}
    >
      {busy ? "chaos in progress…" : "release chaos monkey"}
      <span id="chaos-hint" className="sr-only">
        Easter egg: crashes a few cluster nodes, which then restart on their own.
      </span>
    </button>
  );
}

/** Floating log of the current run: top-right on desktop (clear of the cluster), bottom on mobile. Mounted once. */
export function ChaosLog() {
  const run = useChaosRun();
  // Keep the finished run on screen for a moment after the store clears it.
  const [shown, setShown] = useState<ChaosRun | null>(null);
  const reduce = useReducedMotion();

  if (run && shown !== run) setShown(run);

  useEffect(() => {
    if (run) return;
    const id = window.setTimeout(() => setShown(null), LINGER * 1000);
    return () => window.clearTimeout(id);
  }, [run]);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 w-[min(23rem,calc(100vw-2rem))] lg:top-[5.5rem] lg:bottom-auto">
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.startedAt}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-line-strong bg-bg-raised/95 p-4 backdrop-blur-md font-mono text-[0.7rem] leading-relaxed shadow-2xl"
          >
            <RunLog run={shown} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RunLog({ run }: { run: ChaosRun }) {
  const lines = useMemo(() => logFor(run), [run]);
  const live = useChaosRun() === run;
  const t = useChaosTime(live ? run : null);
  const healed = !live;
  const visible = healed ? lines : lines.filter((l) => l.at <= t);

  return (
    <>
      <p className="mb-2 flex items-center justify-between text-faint">
        <span>chaos-monkey · namespace/portfolio</span>
        <span className={healed ? "text-success" : "text-danger"}>{healed ? "healthy" : "degraded"}</span>
      </p>
      <div role="log" aria-live="polite" aria-label="Chaos Monkey log">
        {visible.map((l) => (
          <p key={`${l.at}-${l.text}`} className={toneClass[l.tone]}>
            {l.text}
          </p>
        ))}
      </div>
    </>
  );
}
