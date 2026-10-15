"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useChaosRun, useChaosTime } from "@/hooks/useChaos";
import { CHAOS, chaos, healedAt, killAt, podName, runDuration, type ChaosRun } from "@/lib/chaos";
import { cn } from "@/lib/cn";
import { site } from "@/content/site";
import { heroLayout } from "@/components/three/heroLayout";
import { StatusDot } from "@/components/ui/StatusDot";

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

/** How long the log stays up after the cluster has healed (s): long enough to read the summary. */
const LINGER = 6;

/** Plain-language result of a run, from the same timeline the cluster plays. */
const summaryFor = (run: ChaosRun) =>
  site.chaos.summary.replace("{n}", String(run.victims.length)).replace("{s}", runDuration(run).toFixed(1));

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

/** Set once the visitor has pressed the crash button (this session): its glow pulse stops for good. */
const TRIED_KEY = "pf-chaos-tried";
const wasTried = () => {
  try {
    return sessionStorage.getItem(TRIED_KEY) === "1";
  } catch {
    return false;
  }
};

/** Soft glow every few seconds (opacity of a glow layer only: compositor work, no repaint). */
const PULSE: Keyframe[] = [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0, offset: 0.34 }, { opacity: 0 }];
const PULSE_MS = 4200;

/**
 * Chaos Monkey button for the hero stage ("Simulate a server crash"): an amber pill with a warning
 * sign, so it reads as something to try, not as an error. Its glow pulses until it has been pressed
 * once (sessionStorage); no pulse with reduced motion. Disabled while a run is in progress.
 */
export function ChaosMonkeyButton({ disabled, className }: { disabled?: boolean; className?: string }) {
  const run = useChaosRun();
  const busy = !!run;
  const glow = useRef<HTMLSpanElement>(null);
  const [tried, setTried] = useState(false);
  const off = disabled || busy;

  useEffect(() => {
    const el = glow.current;
    if (!el || off || tried || wasTried() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = el.animate(PULSE, { duration: PULSE_MS, iterations: Infinity, delay: 1200, easing: "ease-in-out" });
    return () => anim.cancel();
  }, [off, tried]);

  return (
    <button
      type="button"
      onClick={() => {
        chaos.trigger();
        setTried(true);
        try {
          sessionStorage.setItem(TRIED_KEY, "1");
        } catch {}
      }}
      disabled={off}
      aria-describedby="chaos-hint"
      className={cn(
        "pointer-events-auto relative inline-flex items-center gap-1.5 rounded-full border border-warning/60 bg-warning/[0.09] px-3 py-1 font-mono text-xs whitespace-nowrap text-warning",
        "transition-[color,background-color,border-color,transform] duration-200 hover:border-warning hover:bg-warning/[0.18] active:scale-95 active:duration-75 motion-reduce:transform-none",
        "focus-visible:border-warning focus-visible:bg-warning/[0.18] focus-visible:ring-2 focus-visible:ring-warning/60 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-transparent disabled:text-faint",
        className,
      )}
    >
      <span
        ref={glow}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[0_0_14px_2px_rgb(245_158_11/0.5)]"
      />
      {/* Touch: the hit area reaches 44 px tall without changing the look */}
      <span aria-hidden="true" className="absolute inset-x-0 -inset-y-[9px]" />
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0">
        <path d="M8 1.8 L15 14 H1 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 6.2 V9.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.8" r="0.9" fill="currentColor" />
      </svg>
      {busy ? site.chaos.busy : site.chaos.button}
      <span id="chaos-hint" className="sr-only">
        {site.chaos.srHint}
      </span>
    </button>
  );
}

/**
 * Whether the hero is still the section in view: its bottom is below a line 35% down the viewport
 * (the same probe line the navbar uses for the active section).
 */
function useHeroVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "-35% 0px 0px 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  return visible;
}

/** Lines of the log kept on screen (newest at the bottom); older ones scroll off. */
const VISIBLE_LINES = 4;

/**
 * Compact floating log of the current run. Desktop: under the right end of the navbar, and the
 * whale keeps clear of it (its rect goes to heroLayout.chaosLog). Mobile: bottom. Mounted once.
 */
export function ChaosLog() {
  const run = useChaosRun();
  // Keep the finished run on screen for a moment after the store clears it.
  const [shown, setShown] = useState<ChaosRun | null>(null);
  // Runs started from elsewhere (the contact terminal) keep their log wherever you are; a run
  // started in the hero has its log dismissed for good once the hero scrolls out of view.
  const [offHero, setOffHero] = useState(false);
  const [dismissed, setDismissed] = useState<ChaosRun | null>(null);
  const heroVisible = useHeroVisible();
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);

  if (run && shown !== run) {
    setShown(run);
    setOffHero(!heroVisible);
  }
  if (shown && !offHero && !heroVisible && dismissed !== shown) setDismissed(shown);
  const visible = shown && shown !== dismissed ? shown : null;

  useEffect(() => {
    if (run) return;
    const id = window.setTimeout(() => setShown(null), LINGER * 1000);
    return () => window.clearTimeout(id);
  }, [run]);

  // Reserve the log's area for the whale from the first frame of a run (the panel fades in a beat
  // later, by which time the whale is already swimming clear). Released once the exit has finished.
  useLayoutEffect(() => {
    const el = box.current;
    if (!visible || !el) return;
    const publish = () => {
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        heroLayout.chaosLog = null;
        return;
      }
      const r = el.getBoundingClientRect();
      heroLayout.chaosLog = { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
    };
    publish();
    window.addEventListener("resize", publish);
    return () => window.removeEventListener("resize", publish);
  }, [visible]);

  return (
    <div
      ref={box}
      className={cn(
        "pointer-events-none fixed right-4 bottom-4 z-40 w-[min(19rem,calc(100vw-2rem))]",
        // Right-aligned with the navbar's right edge
        "lg:top-[5.25rem] lg:right-[max(1.5rem,calc((100%_-_72rem)/2))] lg:bottom-auto",
      )}
    >
      <AnimatePresence onExitComplete={() => (heroLayout.chaosLog = null)}>
        {visible && (
          <motion.div
            key={visible.startedAt}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            // No delay on the way out (the enter delay only lets the whale swim clear first)
            exit={reduce ? { opacity: 0, transition: { duration: 0.2 } } : { opacity: 0, y: -6, transition: { duration: 0.25 } }}
            transition={{ duration: 0.35, delay: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-lg border border-line-strong bg-bg-raised/90 px-3 py-2.5 font-mono text-[0.68rem] leading-relaxed shadow-xl backdrop-blur-md"
          >
            <RunLog run={visible} />
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
  const visible = (healed ? lines : lines.filter((l) => l.at <= t)).slice(-VISIBLE_LINES);

  return (
    <>
      <p className="mb-1 flex items-center justify-between gap-3 text-faint">
        <span className="truncate">chaos-monkey · portfolio</span>
        <span className={cn("flex items-center gap-1.5", healed ? "text-success" : "text-warning")}>
          <StatusDot accent={healed ? "success" : "warning"} className="size-1.5" />
          {healed ? "healthy" : "degraded"}
        </span>
      </p>
      {/* Fixed height (VISIBLE_LINES lines): the box never grows, so its reserved area stays exact. */}
      <div role="log" aria-live="polite" aria-label="Chaos Monkey log" className="h-[4.42rem] overflow-hidden">
        {visible.map((l) => (
          <p key={`${l.at}-${l.text}`} className={cn("truncate", toneClass[l.tone])}>
            {l.text}
          </p>
        ))}
      </div>
      {/* Plain summary once healed. Its 3 lines are reserved from the start, so the box (and the
          area the whale keeps clear of) never changes size. */}
      <p aria-live="polite" className="mt-1.5 h-[3.4rem] border-t border-line pt-1.5 font-sans text-[0.72rem] leading-snug text-fg">
        {healed ? summaryFor(run) : ""}
      </p>
    </>
  );
}
