/**
 * Chaos Monkey easter egg: shared state + timeline. The DOM (button, log toast, status label,
 * terminal) and the lazy 3D cluster all read the same run, so they stay in sync.
 * Plain module: no React, no three.
 */

/** Seconds, relative to the start of a run. */
export const CHAOS = {
  /** Victim i is killed at i × KILL_STAGGER */
  KILL_STAGGER: 0.3,
  /** Crash flicker before the node goes dark */
  CRASH: 0.9,
  /** First replacement starts here; the others follow every RESTART_STAGGER */
  RESTART_AT: 2.5,
  RESTART_STAGGER: 0.4,
  /** Heal (rise + colour back + core flash) */
  HEAL: 0.8,
} as const;

/** Nodes never killed: the centre (helm wheel) and the one the hero container stands on. */
const PROTECTED = new Set([0, 5]);

export interface ChaosRun {
  /** performance.now() at trigger, ms */
  startedAt: number;
  /** Killed node indices, in kill order */
  victims: number[];
  /** Nodes in the cluster when it ran */
  nodeCount: number;
}

export type VictimPhase = "healthy" | "crashing" | "down" | "healing";

let run: ChaosRun | null = null;
let nodeCount = 13;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const killAt = (i: number) => i * CHAOS.KILL_STAGGER;
export const restartAt = (i: number) => CHAOS.RESTART_AT + i * CHAOS.RESTART_STAGGER;
export const healedAt = (i: number) => restartAt(i) + CHAOS.HEAL;
export const runDuration = (r: ChaosRun) => healedAt(r.victims.length - 1);

/** Where victim `i` of the run is at `t` seconds, with 0–1 progress inside that phase. */
export function victimPhase(i: number, t: number): { phase: VictimPhase; k: number } {
  if (t < killAt(i) || t >= healedAt(i)) return { phase: "healthy", k: 0 };
  if (t < killAt(i) + CHAOS.CRASH) return { phase: "crashing", k: (t - killAt(i)) / CHAOS.CRASH };
  if (t < restartAt(i)) return { phase: "down", k: (t - killAt(i) - CHAOS.CRASH) / (restartAt(i) - killAt(i) - CHAOS.CRASH) };
  return { phase: "healing", k: (t - restartAt(i)) / CHAOS.HEAL };
}

/** Nodes of the run that are not healthy at `t`. */
export function nodesDown(r: ChaosRun, t: number) {
  return r.victims.filter((_, i) => victimPhase(i, t).phase !== "healthy").length;
}

export const chaos = {
  get: () => run,
  /** Seconds since the current run started (or −1). */
  elapsed: () => (run ? (performance.now() - run.startedAt) / 1000 : -1),
  /** The hero tells us how many nodes it renders (fewer on mobile). */
  setNodeCount(n: number) {
    nodeCount = n;
  },
  /** Start a run (ignored while one is in progress). Returns false if one was already running. */
  trigger(): boolean {
    if (run) return false;
    const pool = Array.from({ length: nodeCount }, (_, i) => i).filter((i) => !PROTECTED.has(i));
    const kill = Math.min(pool.length, nodeCount > 7 ? 3 : 2);
    const victims: number[] = [];
    while (victims.length < kill) victims.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    const started: ChaosRun = { startedAt: performance.now(), victims, nodeCount };
    run = started;
    emit();
    window.setTimeout(() => {
      if (run === started) {
        run = null;
        emit();
      }
    }, runDuration(started) * 1000 + 50);
    return true;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Display name of a node pod. */
export const podName = (i: number) => `node-${String(i).padStart(2, "0")}`;
