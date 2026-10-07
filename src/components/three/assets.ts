import { DefaultLoadingManager } from "three";
import { useGLTF } from "@react-three/drei";
import { sceneStore } from "@/lib/sceneStore";

export const MODELS = {
  container: "/models/shipping_container.glb",
  whale: "/models/whale.glb",
  node: "/models/cluster_node.glb",
  helm: "/models/helm_wheel.glb",
} as const;

/** Self-hosted copy of three's Draco decoder (public/draco/) — no third-party CDN. */
export const DRACO_PATH = "/draco/";

let started = false;

/**
 * Called once when the lazy 3D chunk evaluates: mirrors three's loading manager into the
 * shared store (so the boot bar shows real progress), then starts every model download.
 */
export function startAssetLoading() {
  if (started) return;
  started = true;
  sceneStore.set({ chunkLoaded: true });

  // Count unique downloaded files: GLTFLoader registers each model twice (fetch + parse), and
  // embedded textures show up as blob: URLs that are decoded locally, not downloaded.
  const manager = DefaultLoadingManager;
  const isDownload = (url: string) => !/^(blob|data):/.test(url);
  const seen = new Set<string>();
  const finished = new Set<string>();
  const report = () => sceneStore.set({ assetsLoaded: finished.size, assetsTotal: seen.size });
  const { itemStart, itemEnd } = manager;
  manager.itemStart = (url) => {
    itemStart.call(manager, url);
    if (!isDownload(url)) return;
    seen.add(url);
    report();
  };
  manager.itemEnd = (url) => {
    itemEnd.call(manager, url);
    if (!isDownload(url)) return;
    finished.add(url);
    report();
  };
  manager.onError = (url) => console.warn(`[scene] failed to load ${url}`);

  useGLTF.setDecoderPath(DRACO_PATH);
  Object.values(MODELS).forEach((url) => useGLTF.preload(url, DRACO_PATH));
}
