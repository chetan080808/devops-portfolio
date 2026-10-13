"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { assetsDownloaded, sceneStore } from "@/lib/sceneStore";

export type LogTone = "plain" | "ok" | "warn";
export interface LogLine {
  text: string;
  tone: LogTone;
}

/** Typing is a CSS animation (BootSequence) so it starts at first paint, not at hydration. */
export const TYPE_DELAY_MS = 120;
export const CHAR_MS = 22;
const LINE_MS = 130;
/** Lines already due when React hydrates are printed in quick succession instead of all at once. */
const CATCH_UP_MS = 55;
const READY_HOLD = 380;
/** Measured from first paint: stop waiting for assets; the scene fades in on its own once ready. */
const CAP_MS = 2900;
export const EXIT_MS = 450;
export const SKIP_EXIT_MS = 220;

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
    const origin = window.__pfBootT0 ?? performance.now();
    const elapsed = () => performance.now() - origin;
    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, Math.max(0, ms)));
    const push = (text: string, tone: LogTone = "plain") => setLog((l) => [...l, { text, tone }]);
    let finishing = false;

    // Absolute schedule (ms after first paint); anything overdue catches up quickly.
    const now = elapsed();
    const linesAt = TYPE_DELAY_MS + command.length * CHAR_MS + 160;
    let next = 0;
    const schedule = (at: number, fn: () => void) => {
      const delay = Math.max(at - now, next);
      next = delay + CATCH_UP_MS;
      after(delay, fn);
      return delay;
    };
    lines.forEach((line, i) => schedule(linesAt + i * LINE_MS, () => push(line)));
    const pullDelay = schedule(linesAt + lines.length * LINE_MS, () => setPulling(true));

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
    const check = () => {
      if (!pullingShown) return;
      const s = sceneStore.get();
      // Failure first: on a software-only GPU the files still download, but no 3D will follow.
      if (s.failed) finish("failed");
      else if (s.sceneReady || assetsDownloaded(s)) finish("ready");
      else if (s.deferred) finish("deferred");
    };
    const unsubscribe = sceneStore.subscribe(check);
    after(pullDelay + 1, () => {
      pullingShown = true;
      check();
    });
    after(Math.max(CAP_MS - now, pullDelay + 1), () => finish("timeout"));

    return () => {
      timers.forEach(clearTimeout);
      unsubscribe();
    };
  }, [active, command, lines, readyLine, leave]);

  return { command, log, pulling, leaving, skip: () => leave("skip") };
}
