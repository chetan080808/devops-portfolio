import { Mesh, MeshStandardMaterial, Vector3, type Object3D } from "three";
import { cloneWithMaterials } from "../materials";

/** Mini = shipping_container.glb at 0.25× (doors closed), one per project. */
export const MINI_SCALE = 0.25;
/**
 * The authored slots leave ~2 cm between minis, so at hero distance they merge into one glowing
 * slab. Spread them out from the cargo centre so each project reads as its own container.
 */
const SLOT_SPREAD = new Vector3(1.4, 1, 1.35);
/**
 * Single-file layouts: the containers sit close together on the deck, centred on it, with small
 * even gaps (pitch 0.225 × 1.05 ≈ 0.236 vs a turned mini's 0.179 width → ~0.06 gap), so they read
 * as three separate pieces of cargo without overhanging the deck.
 */
const SINGLE_SPREAD = new Vector3(1, 1, 1.05);
/**
 * Minis read as solid containers: dark slate bodies (light enough for the corrugation and door
 * detail to catch the key light on the whale's back), neon only on the edges at a moderate level
 * so they don't bloom into wireframes.
 */
const MINI_NEON_BOOST = 0.9;
const MINI_BODY_COLOR = "#3a4160";

/**
 * Which cargo slots to use for n minis, kept visually balanced on the whale's back.
 * Numbers are Slot_1..Slot_5 from whale.glb; a list of slots means "centred between them".
 * `single` layouts run in single file along the spine, each mini turned 90° so its long,
 * corrugated side faces the camera: in the hero's side / three-quarter view, minis side by side
 * across the back would hide one another.
 */
const SLOT_LAYOUT: Record<number, { single: boolean; slots: number[][] }> = {
  1: { single: true, slots: [[1, 2, 3, 4]] },
  2: { single: true, slots: [[1, 2], [3, 4]] },
  3: { single: true, slots: [[1, 2], [1, 2, 3, 4], [3, 4]] },
  4: { single: false, slots: [[1], [2], [3], [4]] },
  5: { single: false, slots: [[1], [2], [3], [4], [5]] },
};

export interface Mini {
  object: Object3D;
}

/** The minis currently riding the whale (project order), for the scroll drop (MiniDrop). */
export const miniRegistry: { attached: Object3D[] } = { attached: [] };

/**
 * One mini container: an independent clone with its own materials (hover / recolour on one
 * project never touches the others or the hero container), solid slate body, moderate neon.
 */
export function buildMini(containerScene: Object3D) {
  const object = cloneWithMaterials(containerScene, MINI_NEON_BOOST);
  // Own names: the clone carries the "ShippingContainer" node too, which the whale treats as an
  // obstacle to stay above (the hero container).
  object.name = "Mini";
  const inner = object.getObjectByName("ShippingContainer");
  if (inner) inner.name = "MiniContainer";
  object.traverse((o) => {
    const m = (o as Mesh).material;
    if (m instanceof MeshStandardMaterial && !m.userData.neon && m.name !== "PF_InteriorGlow") {
      m.color.set(MINI_BODY_COLOR);
      m.metalness = 0.45;
      m.roughness = 0.55;
    }
  });
  return object;
}

/**
 * Builds `count` independent minis (each its own clone + materials, so hovering or recolouring
 * one never touches the others or the hero container) and parents them to the whale's cargo
 * frame (the bone that holds Slot_1..5), so they ride the Swim animation.
 */
export function attachMinis(whale: Object3D, containerScene: Object3D, count: number): Mini[] {
  const slots = [1, 2, 3, 4, 5].map((n) => whale.getObjectByName(`Slot_${n}`));
  const frame = slots[0]?.parent;
  if (!frame || slots.some((s) => !s)) return [];

  const layout = SLOT_LAYOUT[Math.min(Math.max(count, 0), 5)];
  if (!layout) return [];
  const at = (n: number) => slots[n - 1]!.position;
  const mean = (ns: number[]) => ns.reduce((c, n) => c.add(at(n)), new Vector3()).multiplyScalar(1 / ns.length);
  const centre = mean([1, 2, 3, 4]);
  return layout.slots.map((group) => {
    const position = mean(group)
      .sub(centre)
      .multiply(layout.single ? SINGLE_SPREAD : SLOT_SPREAD)
      .add(centre);
    const object = buildMini(containerScene);
    object.position.copy(position);
    if (layout.single) object.rotation.y = Math.PI / 2;
    object.scale.setScalar(0); // popped in by the whale's timeline
    frame.add(object);
    return { object };
  });
}

