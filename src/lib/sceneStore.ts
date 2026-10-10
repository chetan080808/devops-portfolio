/**
 * Tiny external store shared by the boot overlay (main bundle) and the lazy 3D chunk.
 * Lives outside React and imports nothing from three, so reading it never pulls three
 * into the main bundle.
 */
export interface SceneState {
  /** The lazy 3D chunk (three + R3F + scene code) has been downloaded and evaluated */
  chunkLoaded: boolean;
  /** Files fetched through three's loading manager (the GLBs) */
  assetsLoaded: number;
  assetsTotal: number;
  /** Models parsed and the first frame of the scene rendered */
  sceneReady: boolean;
  /** 3D failed (no WebGL, load error) — the page falls back to the static hero */
  failed: boolean;
  /** Why: "no-gpu" = only software WebGL (static on purpose), "error" = no WebGL / load error */
  failReason: "no-gpu" | "error" | null;
  /** Boot overlay finished or skipped; the hero intro may start */
  bootDone: boolean;
  /** Hero intro: every node landed and linked */
  clusterReady: boolean;
  /** 0–1, never decreases (files can join the queue mid-load) */
  progress: number;
}

let state: SceneState = {
  chunkLoaded: false,
  assetsLoaded: 0,
  assetsTotal: 0,
  sceneReady: false,
  failed: false,
  failReason: null,
  bootDone: false,
  clusterReady: false,
  progress: 0,
};

const listeners = new Set<() => void>();

export const sceneStore = {
  get: () => state,
  set(patch: Partial<SceneState>) {
    const next = { ...state, ...patch };
    next.progress = Math.max(state.progress, computeProgress(next));
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const loadProgress = (s: SceneState) => s.progress;

/** Chunk download counts for 20%, asset files for 70%, first rendered frame for the rest. */
function computeProgress(s: SceneState): number {
  if (s.sceneReady) return 1;
  if (!s.chunkLoaded) return 0;
  const assets = s.assetsTotal > 0 ? s.assetsLoaded / s.assetsTotal : 0;
  return 0.2 + 0.7 * assets;
}
