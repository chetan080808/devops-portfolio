"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { site } from "@/content/site";
import { assetsDownloaded, loadProgress, sceneStore } from "@/lib/sceneStore";
import { useSceneState } from "@/hooks/useSceneState";
import { BOOT_SEEN_KEY } from "./BootGate";
import { CHAR_MS, EXIT_MS, TYPE_DELAY_MS, lineDelayMs } from "./constants";
import { useBootTimeline, type LogLine, type LogTone } from "./useBootTimeline";

const noopSubscribe = () => () => {};
const readGate = () => document.documentElement.dataset.boot ?? "skip";

const toneClass: Record<LogTone, string> = {
  plain: "text-muted",
  ok: "text-success",
  warn: "text-warning",
};

/**
 * Full-screen `kubectl apply` intro. Progress is the real 3D asset download, capped at ~3.5 s.
 *
 * Exit: `html[data-boot=leaving]` + `data-boot-transition` play the reveal in CSS (globals.css):
 * "crt" (CRT power-off) collapses the screen to a line, a dot, then black; reduced motion fades,
 * Skip fades fast. Transform / opacity only. The
 * gate script can trigger the same exit on its own if hydration is slow (see BootGate).
 */
export function BootSequence() {
  // "ssr" during prerender + hydration, then whatever the pre-paint gate script decided.
  const gate = useSyncExternalStore(noopSubscribe, readGate, () => "ssr");
  const [gone, setGone] = useState(false);
  const active = gate === "run" && !gone;

  const { command, log, pulling, leaving, skip } = useBootTimeline(active, () => {
    try {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    } catch {}
  });

  // Intro skipped by the gate (seen this session / reduced motion), or the gate's safety net is
  // already playing the exit: release the hero now.
  useEffect(() => {
    if (gate !== "ssr" && gate !== "run") sceneStore.set({ bootDone: true });
  }, [gate]);

  useEffect(() => {
    if (!leaving) return;
    const html = document.documentElement;
    if (leaving === "skip") html.dataset.bootTransition = "skip";
    html.dataset.boot = "leaving";
    const t = window.setTimeout(
      () => {
        html.dataset.boot = "done";
        // The hero (and its 3D render loop) starts once the reveal has finished: the exit then has
        // the GPU to itself (desktop: 88 of 96 frames dropped when the scene started with it).
        sceneStore.set({ bootDone: true });
        setGone(true);
      },
      EXIT_MS[html.dataset.bootTransition ?? "crt"] ?? 650,
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

  if (gone || (gate !== "ssr" && gate !== "run" && gate !== "leaving")) return null;

  return (
    <div
      id="boot-overlay"
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Booting portfolio"
      // Hidden unless the pre-paint gate chose to run the intro (no JS → never shown).
      className="fixed inset-0 z-[60] hidden outline-none [html[data-boot=leaving]_&]:pointer-events-none [html[data-boot=leaving]_&]:block [html[data-boot=run]_&]:block"
    >
      {/* CRT: the black the screen collapses into (invisible for the other transitions) */}
      <div data-boot-black aria-hidden="true" className="absolute inset-0 bg-black opacity-0" />
      <div data-boot-screen className="absolute inset-0 bg-bg">
        <Screen command={command} log={log} pulling={pulling} onSkip={skip} />
        {/* CRT: the screen turns into a bright line before it shrinks to a dot */}
        <div data-crt-line aria-hidden="true" className="absolute inset-0 bg-[#e6fdff] opacity-0" />
      </div>
    </div>
  );
}

function Screen({ command, log, pulling, onSkip }: { command: string; log: LogLine[]; pulling: boolean; onSkip: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_45%,rgb(34_211_238/0.08),transparent_70%)]"
      />
      {/* Plain line for non-technical visitors. Inside [data-boot-screen]: it leaves with the
          screen (CRT power-off), never on its own. */}
      <p className="relative text-sm text-muted">{site.boot.plainLine}</p>

      <div className="glass glow-edge relative w-full max-w-2xl overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <span className="size-3 rounded-full bg-danger/70" />
          <span className="size-3 rounded-full bg-warning/70" />
          <span className="size-3 rounded-full bg-success/70" />
          <span className="ml-3 font-mono text-xs text-faint">{site.profile.handle}@cluster: ~/portfolio</span>
        </div>

        {/* Fixed height for every row (py-4 + 1.75rem each) so the panel never grows while the log
            prints: 8 rows on phones (the command wraps under the prompt), 7 from sm. */}
        <div aria-hidden="true" className="h-[16rem] px-5 py-4 font-mono text-[0.8rem] leading-7 sm:h-[14.25rem] sm:text-[0.95rem]">
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
              style={{ "--type-ms": `${command.length * CHAR_MS}ms`, "--type-delay": `${TYPE_DELAY_MS}ms` } as CSSProperties}
            />
          </p>
          {/* Fixed lines: CSS-timed from first paint (no wait for hydration on slow phones) */}
          {site.boot.lines.map((line, i) => (
            <p
              key={line}
              data-boot-line
              className="animate-boot-line text-muted"
              style={{ "--line-delay": `${lineDelayMs(i, command.length)}ms` } as CSSProperties}
            >
              {line}
            </p>
          ))}
          {/* Closing line of the gate's safety-net exit (shown by html[data-boot-fallback]) */}
          <p className="hidden text-success [html[data-boot-fallback]_&]:block">{site.boot.fallbackLine}</p>
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
        onClick={onSkip}
        className="absolute right-4 bottom-4 rounded-lg border border-line-strong px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-cyan/50 hover:text-cyan sm:right-6 sm:bottom-6"
      >
        Skip <span aria-hidden="true">›</span>
        <span className="ml-2 hidden text-faint sm:inline">esc</span>
      </button>
    </div>
  );
}

/** The live line: pulling the files, then (phones, which wait for it) warming up the shaders. */
function PullLine() {
  const loaded = useSceneState((s) => s.assetsLoaded);
  const total = useSceneState((s) => s.assetsTotal);
  const compiling = useSceneState((s) => s.bootWaits3d && assetsDownloaded(s));
  const compiled = useSceneState((s) => (s.compileTotal > 0 ? Math.round((s.compileDone / s.compileTotal) * 100) : 0));
  return (
    <p className="text-muted">
      {compiling ? "compiling shaders " : "pulling image portfolio:latest "}
      <span className="text-faint">{compiling ? `${compiled}%` : total > 0 ? `${loaded}/${total} layers` : "resolving…"}</span>
      {/* opacity, not visibility: it keeps blinking while the main thread is busy (compositor) */}
      <span className="ml-1 inline-block animate-boot-blink text-cyan">▍</span>
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
        className="relative h-px w-full overflow-hidden bg-line-strong"
      >
        <div
          className="h-full origin-left bg-cyan shadow-[0_0_8px_rgb(34_211_238/0.8)] transition-transform duration-300 ease-premium"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
        {/* Activity sweep (transform only, runs on the compositor): the boot never looks frozen,
            even while a throttled phone's main thread is busy compiling shaders */}
        {pct < 100 && (
          <span className="absolute inset-y-0 left-0 w-1/5 animate-boot-scan bg-linear-to-r from-transparent via-cyan/70 to-transparent" />
        )}
      </div>
    </div>
  );
}
