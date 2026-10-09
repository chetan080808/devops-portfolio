"use client";

import { useLayoutEffect, type RefObject } from "react";
import { applyRun } from "./runState";

/**
 * Re-derive the run's statuses after EVERY render of a component that renders stage elements.
 * React writes `data-status={final}` whenever such a component re-renders on its own (StageGraph on
 * resize — e.g. when the pin starts —, StageView once the build date hydrates), which would leave
 * that part showing the final state while the header and the rest still follow the scroll.
 */
export function useRunSync(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => applyRun(ref.current?.closest<HTMLElement>("[data-jenkins]") ?? null));
}
