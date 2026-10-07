import { Vector3, type Object3D } from "three";
import { cloneWithMaterials } from "../materials";

/** Mini = shipping_container.glb at 0.25× (doors closed), one per project. */
export const MINI_SCALE = 0.25;
/**
 * The authored slots leave ~2 cm between minis, so at hero distance they merge into one glowing
 * slab. Spread them out from the cargo centre so each project reads as its own container.
 */
const SLOT_SPREAD = new Vector3(1.4, 1, 1.18);
/**
 * Minis are the projects, so their rails must pop: neon pushed well past the standard level.
 * At 0.25× the Container_EdgeGlow rails are ~5 mm thick in world units, so they rely on bloom.
 */
const MINI_NEON_BOOST = 2.4;

/**
 * Which cargo slots to use for n minis, kept visually balanced on the whale's back.
 * Numbers are Slot_1..Slot_5 from whale.glb; a pair [a, b] means "centred between a and b".
 */
const SLOT_LAYOUT: Record<number, Array<number | [number, number]>> = {
  1: [[1, 2]],
  2: [1, 2],
  3: [1, 2, [3, 4]],
  4: [1, 2, 3, 4],
  5: [1, 2, 3, 4, 5],
};

export interface Mini {
  object: Object3D;
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

  const layout = SLOT_LAYOUT[Math.min(Math.max(count, 0), 5)] ?? [];
  const at = (n: number) => slots[n - 1]!.position;
  const centre = [1, 2, 3, 4].reduce((c, n) => c.add(at(n)), new Vector3()).multiplyScalar(0.25);
  return layout.map((slot) => {
    const authored =
      typeof slot === "number" ? at(slot).clone() : new Vector3().addVectors(at(slot[0]), at(slot[1])).multiplyScalar(0.5);
    const position = authored.sub(centre).multiply(SLOT_SPREAD).add(centre);
    const object = cloneWithMaterials(containerScene, MINI_NEON_BOOST);
    object.position.copy(position);
    object.scale.setScalar(0); // popped in by the whale's timeline
    frame.add(object);
    return { object };
  });
}
