"use client";

import { useSyncExternalStore } from "react";
import { sceneStore, type SceneState } from "@/lib/sceneStore";

const serverState = sceneStore.get();

/** Subscribe to one slice of the shared scene store. Re-renders only when the slice changes. */
export function useSceneState<T>(select: (s: SceneState) => T): T {
  return useSyncExternalStore(
    sceneStore.subscribe,
    () => select(sceneStore.get()),
    () => select(serverState),
  );
}
