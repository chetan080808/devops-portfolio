import { Color, MeshBasicMaterial, WebGLRenderTarget, type Camera, type Object3D, type Scene, type WebGLRenderer } from "three";

/**
 * The whale's on-screen silhouette, for the hero mask's scroll-out fade (heroMaskPass): while the
 * cluster fades, the mask keeps only the whale's actual pixels instead of its whole screen box (the
 * box let the half-faded cluster show through at full strength wherever they overlapped).
 * The whale and its attached minis carry WHALE_LAYER; one flat-colour pass of just that layer
 * goes into a half-resolution target, and only while the fade is in progress.
 */
export const WHALE_LAYER = 7;
/**
 * The rest of the hero set (cluster, links, helm wheel, container, floor grid): drawables only,
 * never lights (a changing light count recompiles every shader). The camera drops this layer once
 * the scroll-out fade reaches 0, so nothing is drawn just to be masked away.
 */
export const HERO_SET_LAYER = 6;

export function markHeroSet(root: Object3D) {
  root.traverse((o) => {
    const d = o as Object3D & { isMesh?: boolean; isLine?: boolean; isPoints?: boolean };
    if (d.isMesh || d.isLine || d.isPoints) o.layers.set(HERO_SET_LAYER);
  });
}

export const silhouetteMaterial = new MeshBasicMaterial({ color: 0xffffff });

export function markWhale(root: Object3D) {
  root.traverse((o) => o.layers.enable(WHALE_LAYER));
}

export function createSilhouetteTarget() {
  return new WebGLRenderTarget(1, 1, { depthBuffer: true });
}

const clearColor = new Color();

export function renderSilhouette(gl: WebGLRenderer, scene: Scene, camera: Camera, target: WebGLRenderTarget) {
  const layers = camera.layers.mask;
  const override = scene.overrideMaterial;
  const background = scene.background;
  const prevTarget = gl.getRenderTarget();
  gl.getClearColor(clearColor);
  const clearAlpha = gl.getClearAlpha();

  camera.layers.set(WHALE_LAYER);
  scene.overrideMaterial = silhouetteMaterial;
  scene.background = null;
  gl.setRenderTarget(target);
  gl.setClearColor(0x000000, 0);
  gl.clear(true, true, false);
  gl.render(scene, camera);

  gl.setRenderTarget(prevTarget);
  gl.setClearColor(clearColor, clearAlpha);
  scene.background = background;
  scene.overrideMaterial = override;
  camera.layers.mask = layers;
}
