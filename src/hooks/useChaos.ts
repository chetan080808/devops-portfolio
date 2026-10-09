"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { chaos, type ChaosRun } from "@/lib/chaos";

/** The current Chaos Monkey run (null when the cluster is healthy). */
export function useChaosRun(): ChaosRun | null {
  return useSyncExternalStore(chaos.subscribe, chaos.get, () => null);
}

/** Seconds into the current run, refreshed every `stepMs` while one is in progress (−1 otherwise). */
export function useChaosTime(run: ChaosRun | null, stepMs = 100): number {
  const [t, setT] = useState(-1);
  useEffect(() => {
    if (!run) return;
    const tick = () => setT((performance.now() - run.startedAt) / 1000);
    tick();
    const id = window.setInterval(tick, stepMs);
    return () => {
      window.clearInterval(id);
      setT(-1);
    };
  }, [run, stepMs]);
  return run ? t : -1;
}
