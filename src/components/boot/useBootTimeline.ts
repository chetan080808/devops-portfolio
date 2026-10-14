"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { assetsDownloaded, sceneStore } from "@/lib/sceneStore";
import { lineDelayMs } from "./constants";

export type LogTone = "plain" | "ok" | "warn";
export interface LogLine {
  text: string;
  tone: LogTone;
}

const READY_HOLD = 380;
/** Measured from first paint: stop waiting for assets; the scene fades in on its own once ready. */
const CAP_MS = 2900;

/**
 * Drives the boot log on a clock that starts at first paint (set by BootGate), so loading,
 * typing and log lines all run in parallel with hydration. Exits once every file has
 * downloaded (shader warm-up finishes behind the fade; the intro only starts on the first
 * rendered frame) or at the time cap. `active` is false when the gate skipped the intro.
 */
export function useBootTimeline(active: boolean, onLeave: () => void) {
  const { command, lines, readyLine } = site.boot;
  const [log, setLog] = useState<LogLine[]>([]);
  const [pulling, setPulling] = useState(false);
  const [leaving, setLeaving] = useState<false | "done" | "skip">(false);
  const leavingRef = useRef(false);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  const leave = useCallback((how: "done" | "skip") => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(how);
    onLeaveRef.current();
  }, []);

  useEffect(() => {
    if (!active) return;
    // React has the boot now: the gate script's safety-net exit stands down.
    window.__pfBootLive = true;
    // Took over during the safety net's hold: its closing line goes, React prints its own.
    delete document.documentElement.dataset.bootFallback;
    const origin = window.__pfBootT0 ?? performance.now();
    const elapsed = () => performance.now() - origin;
    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, Math.max(0, ms)));
    const push = (text: string, tone: LogTone = "plain") => setLog((l) => [...l, { text, tone }]);
    let finishing = false;
    let cancelled = false;

    // Absolute schedule (ms after first paint). The fixed lines are CSS-timed in BootSequence (they
    // appear even before hydration); the "pulling" line follows them.
    const now = elapsed();
    const pullDelay = Math.max(lineDelayMs(lines.length, command.length) - now, 0);

    const finish = (outcome: "ready" | "deferred" | "failed" | "timeout") => {
      if (finishing || leavingRef.current) return;
      finishing = true;
      setPulling(false);
      const { assetsTotal } = sceneStore.get();
      if (outcome === "deferred") {
        push(sceneStore.get().deferredAuto ? "[ OK ] hero ready · 3D streaming in" : "[ OK ] static hero · 3D on demand", "ok");
        after(90, () => push(`[ OK ] ${readyLine}`, "ok"));
      } else if (outcome === "ready") {
        push(`[ OK ] pulled ${assetsTotal} layers`, "ok");
        after(90, () => push(`[ OK ] ${readyLine}`, "ok"));
      } else if (outcome === "failed") {
        push(
          sceneStore.get().failReason === "no-gpu"
            ? "[ WARN ] no GPU acceleration — serving static build"
            : "[ WARN ] WebGL unavailable — serving static build",
          "warn",
        );
      } else {
        push("[ WARN ] still pulling — continuing in background", "warn");
      }
      after(READY_HOLD, () => leave("done"));
    };

    let pullingShown = false;
    let capReached = false;
    const check = () => {
      if (!pullingShown) return;
      const s = sceneStore.get();
      // Failure first: on a software-only GPU the files still download, but no 3D will follow.
      if (s.failed) finish("failed");
      else if (s.sceneReady || assetsDownloaded(s)) finish("ready");
      else if (s.deferred) finish("deferred");
    };
    const unsubscribe = sceneStore.subscribe(check);
    // The CSS clock starts at the lines' first style pass, which can trail first paint: wait until
    // the last one is really visible, so nothing React prints ever jumps ahead of it.
    after(pullDelay, () =>
      fixedLinesShown().then(() => {
        if (cancelled) return;
        setPulling(true);
        pullingShown = true;
        check();
        if (capReached) finish("timeout");
      }),
    );
    after(CAP_MS - now, () => {
      capReached = true;
      if (pullingShown) finish("timeout");
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      unsubscribe();
    };
  }, [active, command, lines, readyLine, leave]);

  return { command, log, pulling, leaving, skip: () => leave("skip") };
}

/** Resolves once the last fixed (CSS-timed) log line has appeared; immediately if there is none. */
function fixedLinesShown(): Promise<unknown> {
  const all = document.querySelectorAll("[data-boot-door=right] [data-boot-line]");
  const last = all[all.length - 1];
  if (!last) return Promise.resolve();
  return Promise.all(last.getAnimations().map((a) => a.finished)).catch(() => {});
}
