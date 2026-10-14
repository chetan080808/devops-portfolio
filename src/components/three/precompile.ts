import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  type Camera,
  type Material,
  type Object3D,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";

/**
 * Shader warm-up. Without it every material compiles synchronously the first time it is drawn:
 * single intro frames of 0.4–1.7 s measured on a Windows laptop GPU (ANGLE/D3D11 compiles are
 * slow on a cold shader cache). We compile everything during the boot instead, one object at a
 * time with `compileAsync` (KHR_parallel_shader_compile where available), yielding to the browser
 * after real work, so the intro itself plays without compile hitches.
 *
 * Every program is compiled for the render target it is really drawn into: three.js builds a
 * different program for a render target (linear output) than for the canvas (sRGB output), so a
 * program warmed against the wrong one is compiled a second time on its first real frame
 * (measured on the live site: ~245 compiles, 2.3–2.9 s, right when the intro started).
 */

/** Where the main scene is drawn: the composer's input target (RenderPass), or null = canvas. */
export const sceneTarget: { current: WebGLRenderTarget | null } = { current: null };
/** Fullscreen-pass materials (bloom, mask, output) → the target each pass draws into (null = canvas). */
export const postMaterials = new Map<Material, WebGLRenderTarget | null>();
/** Extra scenes rendered by hand straight to the canvas (e.g. the minis' overlay scene). */
export const extraScenes = new Set<Scene>();
/** Override materials drawn on one layer of the scene into their own target (whale silhouette). */
export const layerOverrides = new Set<{ material: Material; layer: number; target: WebGLRenderTarget | null }>();

const isMaterial = (v: unknown): v is Material => !!v && typeof v === "object" && (v as Material).isMaterial === true;

/** Every material a postprocessing pass owns (direct fields, arrays, fsQuad). */
export function passMaterials(pass: object): Material[] {
  const found = new Set<Material>();
  for (const value of Object.values(pass)) {
    if (isMaterial(value)) found.add(value);
    else if (Array.isArray(value)) value.filter(isMaterial).forEach((m) => found.add(m));
  }
  const quad = (pass as { fsQuad?: { material?: unknown } }).fsQuad;
  if (isMaterial(quad?.material)) found.add(quad.material);
  return [...found];
}

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Yield only after real work: most objects reuse an already compiled program (~0 ms). */
let lastYield = 0;
async function maybeYield() {
  if (performance.now() - lastYield < 8) return;
  await yieldToBrowser();
  lastYield = performance.now();
}

/**
 * compileAsync() picks the program variant synchronously (from the current render target), then
 * waits for the driver; so the target only has to be set around the call itself.
 */
function compileFor(gl: WebGLRenderer, target: WebGLRenderTarget | null, object: Object3D, camera: Camera, scene: Scene) {
  const previous = gl.getRenderTarget();
  gl.setRenderTarget(target);
  try {
    return gl.compileAsync(object, camera, scene);
  } finally {
    gl.setRenderTarget(previous);
  }
}

function drawablesOf(root: Object3D) {
  const drawables: Object3D[] = [];
  root.traverse((o) => {
    const d = o as Mesh;
    if (d.material && (d.isMesh || (o as { isPoints?: boolean }).isPoints || (o as { isLine?: boolean }).isLine)) drawables.push(o);
  });
  return drawables;
}

async function compileEach(
  gl: WebGLRenderer,
  root: Object3D,
  camera: Camera,
  target: WebGLRenderTarget | null,
  isCancelled: () => boolean,
  step: () => void,
) {
  for (const object of drawablesOf(root)) {
    if (isCancelled()) return;
    // `object` is compiled against `root`'s lights (the program depends on them).
    await compileFor(gl, target, object, camera, root as Scene);
    step();
    await maybeYield();
  }
}

/** Meshes the override material is compiled against (only its layer enabled). */
function layerTargets(scene: Scene, layer: number) {
  const targets: Mesh[] = [];
  scene.traverse((o) => {
    if ((o as Mesh).isMesh && o.layers.isEnabled(layer)) targets.push(o as Mesh);
  });
  return targets;
}

/** `onProgress(done, total)` after every step (one object x target); the boot shows it on phones. */
export async function precompile(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  isCancelled: () => boolean,
  onProgress: (done: number, total: number) => void = () => {},
) {
  let total = drawablesOf(scene).length + postMaterials.size;
  for (const extra of extraScenes) total += drawablesOf(extra).length;
  for (const { layer } of layerOverrides) total += layerTargets(scene, layer).length;
  let done = 0;
  const step = () => onProgress(++done, total);
  onProgress(0, total);

  await compileEach(gl, scene, camera, sceneTarget.current, isCancelled, step);
  for (const extra of extraScenes) await compileEach(gl, extra, camera, null, isCancelled, step);

  // Override passes: compile the override against each object on its layer (skinned or not).
  for (const { material, layer, target } of layerOverrides) {
    for (const mesh of layerTargets(scene, layer)) {
      if (isCancelled()) return;
      const own = mesh.material;
      const layers = camera.layers.mask;
      mesh.material = material;
      // The override pass renders with only its layer enabled (whaleSilhouette.ts), so it sees
      // none of the scene's lights: compile the same variant (light counts are in the program).
      camera.layers.set(layer);
      try {
        await compileFor(gl, target, mesh, camera, scene);
      } finally {
        mesh.material = own;
        camera.layers.mask = layers;
      }
      step();
      await maybeYield();
    }
  }

  // Post passes draw a fullscreen triangle with their own material: compile each on a stand-in quad.
  const quadScene = new Scene();
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  for (const [material, target] of postMaterials) {
    if (isCancelled()) break;
    const quad = new Mesh(geometry, material);
    quadScene.add(quad);
    await compileFor(gl, target, quad, quadCamera, quadScene);
    quadScene.remove(quad);
    step();
    await maybeYield();
  }
  geometry.dispose();
}
