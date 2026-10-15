import { useSyncExternalStore } from "react";
import { site } from "@/content/site";

/**
 * The job's build number, like Jenkins: the career run is build #n (n = milestones), and every
 * Build Now press in this browser session gets the next number. Remembered in sessionStorage
 * (best effort: without it the count restarts on reload).
 */
const BASE = site.experience.length;
const KEY = "pf-build-number";

let current: number | null = null;
const listeners = new Set<() => void>();

function read() {
  if (current !== null) return current;
  let n = BASE;
  try {
    const saved = Number(sessionStorage.getItem(KEY));
    if (Number.isInteger(saved) && saved > BASE) n = saved;
  } catch {}
  return (current = n);
}

/** Starts the next build and returns its number. */
export function nextBuildNumber() {
  const n = read() + 1;
  current = n;
  try {
    sessionStorage.setItem(KEY, String(n));
  } catch {}
  listeners.forEach((l) => l());
  return n;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Latest build number (server HTML: the career run's own number). */
export const useBuildNumber = () => useSyncExternalStore(subscribe, read, () => BASE);
