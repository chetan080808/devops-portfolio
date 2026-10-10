import { Mesh, OrthographicCamera, PlaneGeometry, Scene, type Camera, type Material, type Object3D, type WebGLRenderer } from "three";

/**
 * Shader warm-up. Without it every material compiles synchronously the first time it is drawn:
 * single intro frames of 0.4–1.7 s measured on a Windows laptop GPU (ANGLE/D3D11 compiles are
 * slow on a cold shader cache). We compile everything during the boot instead, one object at a
 * time with `compileAsync` (KHR_parallel_shader_compile where available), yielding to the browser
 * after real work, so the intro itself plays without compile hitches.
 */

/** Fullscreen-pass materials (bloom, mask, output): not in any scene, registered by their owners. */
export const postMaterials = new Set<Material>();
/** Extra scenes rendered by hand (e.g. the minis' overlay scene). */
export const extraScenes = new Set<Scene>();

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

async function compileEach(gl: WebGLRenderer, root: Object3D, camera: Camera, isCancelled: () => boolean) {
  const drawables: Object3D[] = [];
  root.traverse((o) => {
    const d = o as Mesh;
    if (d.material && (d.isMesh || (o as { isPoints?: boolean }).isPoints || (o as { isLine?: boolean }).isLine)) drawables.push(o);
  });
  for (const object of drawables) {
    if (isCancelled()) return;
    // `object` is compiled against `root`'s lights (the program depends on them).
    await gl.compileAsync(object, camera, root as Scene);
    await maybeYield();
  }
}

export async function precompile(gl: WebGLRenderer, scene: Scene, camera: Camera, isCancelled: () => boolean) {
  await compileEach(gl, scene, camera, isCancelled);
  for (const extra of extraScenes) await compileEach(gl, extra, camera, isCancelled);

  // Post passes draw a fullscreen triangle with their own material: compile each on a stand-in quad.
  const quadScene = new Scene();
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  for (const material of postMaterials) {
    if (isCancelled()) break;
    const quad = new Mesh(geometry, material);
    quadScene.add(quad);
    await gl.compileAsync(quad, quadCamera, quadScene);
    quadScene.remove(quad);
    await maybeYield();
  }
  geometry.dispose();
}
