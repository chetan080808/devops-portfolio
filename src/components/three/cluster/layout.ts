import { Vector3 } from "three";

/** World scale of cluster_node.glb (native: flat-top hex, ~2.0 × 1.74, top at y≈0.29). */
export const NODE_SCALE = 0.6;
/** Centre-to-centre distance between neighbouring nodes (leaves room for glowing links). */
const NEIGHBOUR_DIST = 1.55;
/** Height of the link beams (just below the node deck). */
export const LINK_Y = 0.1;
/** Distance from a node's centre to its flat side, where a link starts. */
export const LINK_INSET = 0.87 * NODE_SCALE;

// Axial coordinates — same honeycomb as the static SVG (HexCluster): centre, inner ring, 6 outer.
const AXIAL: Array<[number, number]> = [
  [0, 0],
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
  [2, -1], [-2, 1], [1, 1], [-1, -1], [2, -2], [-2, 2],
];
export const NODE_COUNT = { desktop: AXIAL.length, mobile: 7 } as const;

/** Fly-in timing (seconds from intro start). */
const FLY_DURATION = 1.05;
const LINK_DRAW = 0.42;

export interface NodeSpec {
  id: number;
  position: Vector3;
  /** Where it flies in from */
  from: Vector3;
  fromSpin: number;
  fromTilt: number;
  delay: number;
  duration: number;
  /** When it visually lands (expo-out is ~99% there at 75% of its duration) */
  landsAt: number;
}

export interface LinkSpec {
  a: number;
  b: number;
  start: Vector3;
  end: Vector3;
  delay: number;
  duration: number;
}

/** Deterministic PRNG so the choreography is identical on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCluster(count: number) {
  const rand = mulberry32(42);
  const size = NEIGHBOUR_DIST / Math.sqrt(3);

  const nodes: NodeSpec[] = AXIAL.slice(0, count).map(([q, r], id) => {
    const position = new Vector3(size * 1.5 * q, 0, size * Math.sqrt(3) * (r + q / 2));
    const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    const outward = position.lengthSq() > 0 ? position.clone().normalize() : new Vector3(0, 0, 1);
    const from = position
      .clone()
      .addScaledVector(outward, 3 + rand() * 1.5)
      .add(new Vector3((rand() - 0.5) * 1.5, 3.5 + rand() * 2.5, (rand() - 0.5) * 1.5));
    const indexInRing = ring === 0 ? 0 : ring === 1 ? id - 1 : id - 7;
    const delay = ring === 0 ? 0 : ring === 1 ? 0.14 + indexInRing * 0.07 : 0.52 + indexInRing * 0.07;
    return {
      id,
      position,
      from,
      fromSpin: (rand() - 0.5) * Math.PI * 2.4,
      fromTilt: (rand() - 0.5) * 1.1,
      delay,
      duration: FLY_DURATION,
      landsAt: delay + FLY_DURATION * 0.75,
    };
  });

  const links: LinkSpec[] = [];
  for (const a of nodes) {
    for (const b of nodes) {
      if (b.id <= a.id || a.position.distanceTo(b.position) > NEIGHBOUR_DIST * 1.05) continue;
      const dir = b.position.clone().sub(a.position).normalize();
      links.push({
        a: a.id,
        b: b.id,
        start: a.position.clone().addScaledVector(dir, LINK_INSET).setY(LINK_Y),
        end: b.position.clone().addScaledVector(dir, -LINK_INSET).setY(LINK_Y),
        delay: Math.max(a.landsAt, b.landsAt) - 0.05,
        duration: LINK_DRAW,
      });
    }
  }
  // Links wait for both ends to land, so the cluster wires itself up from the centre outward.
  const settledAt = Math.max(...links.map((l) => l.delay + l.duration), ...nodes.map((n) => n.landsAt));
  return { nodes, links, settledAt };
}
