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
  /** Models parsed and every shader compiled (the render loop may start) */
  sceneReady: boolean;
  /** The canvas has rendered FIRST_VISIBLE_FRAME frames and may be shown: its very first frame
   *  comes out opaque and dark (post-processing targets not settled yet), a one-frame flash */
  framesShown: boolean;
  /** 3D failed (no WebGL, load error) — the page falls back to the static hero */
  failed: boolean;
  /** Why: "no-gpu" = only software WebGL (static on purpose), "error" = no WebGL / load error */
  failReason: "no-gpu" | "error" | null;
  /** Phones: the 3D scene isn't loaded yet (static image instead); boot counts it as done */
  deferred: boolean;
  /** …and it will load by itself once the page is idle (capable phone), vs only on request */
  deferredAuto: boolean;
  /** The boot is running and loads the 3D (desktop, capable phone): it waits for it (sceneReady,
   *  capped at WAIT_3D_CAP_MS) instead of ending on the downloads */
  bootWaits3d: boolean;
  /** Shader warm-up steps done / planned (precompile.ts); 0 / 0 until it starts */
  compileDone: number;
  compileTotal: number;
  /** The still was on screen before the 3D: the 3D comes in already settled (no intro), in the
   *  pose the still was captured in */
  introSettled: boolean;
  /** The intro clock has started (first rendered frame after the boot): too late to switch to a
   *  settled start, so the still must not appear any more */
  introStarted: boolean;
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
  framesShown: false,
  failed: false,
  failReason: null,
  deferred: false,
  deferredAuto: false,
  bootWaits3d: false,
  compileDone: 0,
  compileTotal: 0,
  introSettled: false,
  introStarted: false,
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

/**
 * Every file the scene needs is here (the 3D chunk and all models). The boot ends on this, not on
 * `sceneReady`: shader warm-up keeps going behind the boot's fade, and the hero swaps from the
 * static cluster to 3D once it's done.
 */
export const assetsDownloaded = (s: SceneState) => s.chunkLoaded && s.assetsTotal > 0 && s.assetsLoaded >= s.assetsTotal;

/**
 * Chunk download counts for 20%, model files for the other 80%. When the boot waits for the 3D
 * (desktop, capable phones), the shader warm-up is part of it: chunk 15%, models 45%, warm-up 40%.
 */
function computeProgress(s: SceneState): number {
  if (s.sceneReady) return 1;
  const assets = s.assetsTotal > 0 ? s.assetsLoaded / s.assetsTotal : 0;
  if (s.bootWaits3d) {
    if (!s.chunkLoaded) return 0;
    if (!assetsDownloaded(s)) return 0.15 + 0.45 * assets;
    return 0.6 + 0.4 * (s.compileTotal > 0 ? s.compileDone / s.compileTotal : 0);
  }
  if (s.deferred || assetsDownloaded(s)) return 1;
  if (!s.chunkLoaded) return 0;
  return 0.2 + 0.8 * assets;
}
