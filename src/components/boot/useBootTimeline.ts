"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { sceneStore } from "@/lib/sceneStore";

export type LogTone = "plain" | "ok" | "warn";
export interface LogLine {
  text: string;
  tone: LogTone;
}

const START_DELAY = 150;
const CHAR_MS = 24;
const LINE_MS = 130;
const READY_HOLD = 380;
/** Stop waiting for assets after this; the scene fades in on its own once ready. */
const CAP_MS = 2900;
export const EXIT_MS = 450;
export const SKIP_EXIT_MS = 220;

/**
 * Drives the boot terminal: types the command, prints log lines, then waits for the real
 * scene-ready signal (or the time cap) before exiting. `active` is false when the gate
 * script decided to skip the intro.
 */
export function useBootTimeline(active: boolean, onLeave: () => void) {
  const { command, lines, readyLine } = site.boot;
  const [typed, setTyped] = useState(0);
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
    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const push = (text: string, tone: LogTone = "plain") => setLog((l) => [...l, { text, tone }]);
    const started = performance.now();
    let finishing = false;

    for (let i = 1; i <= command.length; i++) after(START_DELAY + i * CHAR_MS, () => setTyped(i));
    const linesAt = START_DELAY + command.length * CHAR_MS + 160;
    lines.forEach((line, i) => after(linesAt + i * LINE_MS, () => push(line)));
    const pullAt = linesAt + lines.length * LINE_MS;
    after(pullAt, () => setPulling(true));

    const finish = (outcome: "ready" | "failed" | "timeout") => {
      if (finishing || leavingRef.current) return;
      finishing = true;
      setPulling(false);
      const { assetsTotal } = sceneStore.get();
      if (outcome === "ready") {
        push(`[ OK ] pulled ${assetsTotal} layers`, "ok");
        after(90, () => push(`[ OK ] ${readyLine}`, "ok"));
      } else if (outcome === "failed") {
        push("[ WARN ] WebGL unavailable — serving static build", "warn");
      } else {
        push("[ WARN ] still pulling — continuing in background", "warn");
      }
      after(READY_HOLD, () => leave("done"));
    };

    const check = () => {
      if (performance.now() - started < pullAt) return;
      const s = sceneStore.get();
      if (s.sceneReady) finish("ready");
      else if (s.failed) finish("failed");
    };
    const unsubscribe = sceneStore.subscribe(check);
    after(pullAt, check);
    after(CAP_MS, () => finish("timeout"));

    return () => {
      timers.forEach(clearTimeout);
      unsubscribe();
    };
  }, [active, command, lines, readyLine, leave]);

  return { command, typed, log, pulling, leaving, skip: () => leave("skip") };
}
