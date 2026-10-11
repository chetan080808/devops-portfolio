"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { loadProgress, sceneStore } from "@/lib/sceneStore";
import { useSceneState } from "@/hooks/useSceneState";
import { BOOT_SEEN_KEY } from "./BootGate";
import type { CSSProperties } from "react";
import { CHAR_MS, EXIT_MS, SKIP_EXIT_MS, TYPE_DELAY_MS, useBootTimeline, type LogTone } from "./useBootTimeline";

const noopSubscribe = () => () => {};
const readGate = () => document.documentElement.dataset.boot ?? "skip";

const toneClass: Record<LogTone, string> = {
  plain: "text-muted",
  ok: "text-success",
  warn: "text-warning",
};

/** Full-screen `kubectl apply` intro. Progress is the real 3D asset download, capped at ~3.5 s. */
export function BootSequence() {
  // "ssr" during prerender + hydration, then whatever the pre-paint gate script decided.
  const gate = useSyncExternalStore(noopSubscribe, readGate, () => "ssr");
  const [gone, setGone] = useState(false);
  const active = gate === "run" && !gone;

  const { command, log, pulling, leaving, skip } = useBootTimeline(active, () => {
    sceneStore.set({ bootDone: true });
    try {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    } catch {}
  });

  // Intro skipped by the gate (seen this session / reduced motion): release the hero now.
  useEffect(() => {
    if (gate !== "ssr" && gate !== "run") sceneStore.set({ bootDone: true });
  }, [gate]);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(
      () => {
        document.documentElement.dataset.boot = "done";
        setGone(true);
      },
      leaving === "skip" ? SKIP_EXIT_MS : EXIT_MS,
    );
    return () => clearTimeout(t);
  }, [leaving]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skip]);

  // Modal while it runs: focus moves into the dialog (Tab → Skip) and the page behind is inert.
  const dialogRef = useRef<HTMLDivElement>(null);
  const modal = active && !leaving;
  useEffect(() => {
    if (!modal) return;
    const overlay = dialogRef.current;
    const behind = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== overlay && el.tagName !== "SCRIPT" && !el.inert,
    );
    behind.forEach((el) => (el.inert = true));
    overlay?.focus({ preventScroll: true });
    return () => behind.forEach((el) => (el.inert = false));
  }, [modal]);

  if (gone || (gate !== "ssr" && gate !== "run")) return null;

  return (
    <div
      id="boot-overlay"
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Booting portfolio"
      className={cn(
        // Hidden unless the pre-paint gate chose to run the intro (no JS → never shown)
        "fixed inset-0 z-[60] hidden items-center outline-none justify-center bg-bg px-4 ease-premium [html[data-boot=run]_&]:flex",
        "transition-[opacity,transform,filter]",
        leaving && "pointer-events-none scale-[1.015] opacity-0 blur-sm",
      )}
      style={{ transitionDuration: `${leaving === "skip" ? SKIP_EXIT_MS : EXIT_MS}ms` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_45%,rgb(34_211_238/0.08),transparent_70%)]"
      />

      <div className="glass glow-edge relative w-full max-w-2xl overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <span className="size-3 rounded-full bg-danger/70" />
          <span className="size-3 rounded-full bg-warning/70" />
          <span className="size-3 rounded-full bg-success/70" />
          <span className="ml-3 font-mono text-xs text-faint">{site.profile.handle}@cluster: ~/portfolio</span>
        </div>

        {/* Fixed height for all 7 lines so the panel never grows while the log prints */}
        <div aria-hidden="true" className="h-[13.25rem] px-5 py-4 font-mono text-[0.85rem] leading-7 sm:h-[13.75rem] sm:text-[0.95rem]">
          <p className="text-fg">
            <span className="text-success">➜</span> <span className="text-cyan">~/portfolio</span>{" "}
            <span className="text-faint">$</span>{" "}
            {/* Typed by CSS from first paint, so it never waits for hydration */}
            <span
              className="inline-block animate-boot-type overflow-hidden align-bottom whitespace-nowrap"
              style={
                {
                  "--chars": command.length,
                  "--type-ms": `${command.length * CHAR_MS}ms`,
                  "--type-delay": `${TYPE_DELAY_MS}ms`,
                } as CSSProperties
              }
            >
              {command}
            </span>
            <span
              className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] animate-boot-caret bg-cyan"
              style={
                { "--type-ms": `${command.length * CHAR_MS}ms`, "--type-delay": `${TYPE_DELAY_MS}ms` } as CSSProperties
              }
            />
          </p>
          {log.map((line, i) => (
            <p key={i} className={toneClass[line.tone]}>
              {line.text}
            </p>
          ))}
          {pulling && <PullLine />}
        </div>

        <ProgressBar />
      </div>

      <button
        type="button"
        onClick={skip}
        className="absolute right-4 bottom-4 rounded-lg border border-line-strong px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-cyan/50 hover:text-cyan sm:right-6 sm:bottom-6"
      >
        Skip <span aria-hidden="true">›</span>
        <span className="ml-2 hidden text-faint sm:inline">esc</span>
      </button>
    </div>
  );
}

function PullLine() {
  const loaded = useSceneState((s) => s.assetsLoaded);
  const total = useSceneState((s) => s.assetsTotal);
  return (
    <p className="text-muted">
      pulling image portfolio:latest{" "}
      <span className="text-faint">{total > 0 ? `${loaded}/${total} layers` : "resolving…"}</span>
      <span className="ml-1 inline-block animate-blink text-cyan">▍</span>
    </p>
  );
}

function ProgressBar() {
  const pct = Math.round(useSceneState(loadProgress) * 100);
  return (
    <div className="border-t border-line px-5 py-3.5">
      <div className="mb-2 flex justify-between font-mono text-xs text-faint">
        <span>rollout status</span>
        <span className={pct === 100 ? "text-success" : "text-cyan"}>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Loading 3D scene"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-px w-full bg-line-strong"
      >
        <div
          className="h-full origin-left bg-cyan shadow-[0_0_8px_rgb(34_211_238/0.8)] transition-transform duration-300 ease-premium"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}
