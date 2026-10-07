import { Mesh, MeshStandardMaterial, type Material, type Object3D } from "three";

/** Emissive strength (as authored in Blender) above which a material counts as neon. */
const NEON_THRESHOLD = 1.5;
/**
 * Authored neon strength is 2.8–3.4, which clips to near-white on screen. ~1.1 matches the
 * Blender "Standard" renders: true #22d3ee cyan, dark bodies readable, bloom only on edges.
 */
const NEON_LEVEL = 0.33;

/** Neon material, judged on the source glTF material or a clone already tagged by us. */
export const isNeon = (m: Material): m is MeshStandardMaterial =>
  m instanceof MeshStandardMaterial && (m.userData.neon === true || m.emissiveIntensity >= NEON_THRESHOLD);

/**
 * Deep-clones a loaded glTF scene AND every material on it, so per-instance changes
 * (flash, hover, Chaos Monkey recolor) never leak into other instances. Neon materials
 * skip tone mapping so cyan/violet stay saturated; bloom provides the glow. `neonBoost`
 * scales this instance's neon relative to the standard level (e.g. > 1 for the minis).
 */
export function cloneWithMaterials<T extends Object3D>(source: T, neonBoost = 1): T {
  const root = source.clone(true) as T;
  const cache = new Map<Material, Material>();
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const swap = (m: Material) => {
      let copy = cache.get(m);
      if (!copy) {
        copy = m.clone();
        if (isNeon(copy)) {
          copy.userData.neon = true;
          copy.toneMapped = false;
          copy.emissiveIntensity *= NEON_LEVEL * neonBoost;
        }
        cache.set(m, copy);
      }
      return copy;
    };
    obj.material = Array.isArray(obj.material) ? obj.material.map(swap) : swap(obj.material);
  });
  return root;
}

/** Every neon material under the object named `name` (e.g. "ClusterNode_Core"). */
export function neonMaterialsUnder(root: Object3D, name: string): MeshStandardMaterial[] {
  const found = new Set<MeshStandardMaterial>();
  root.getObjectByName(name)?.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const mats: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.filter(isNeon).forEach((m) => found.add(m));
  });
  return [...found];
}

/** Free the per-instance material clones made by `cloneWithMaterials` (geometry stays cached). */
export function disposeMaterials(root: Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const mats: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => m.dispose());
  });
}
