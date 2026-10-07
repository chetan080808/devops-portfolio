import { CatmullRomCurve3, Vector3 } from "three";
import { NODE_SCALE } from "../cluster/layout";

/**
 * Hero moment (3c), all in world units and seconds from intro start.
 * Cluster nodes land by ~1.7 s, links by ~2.0 s, the helm wheel by ~2.25 s.
 */

// ── Container ─────────────────────────────────────────────────────────────
/** Sits on the front-left node (axial −1, 1), same scale as the nodes. */
export const CONTAINER_SCALE = NODE_SCALE;
export const CONTAINER_POS = new Vector3(-1.342, NODE_SCALE * 0.262, 0.775);
/**
 * Doors (local +Z) turned toward camera-right, so the whale exits at a three-quarter
 * angle instead of straight at the camera.
 */
export const CONTAINER_YAW = 0.8;
export const DOOR_DIR = new Vector3(Math.sin(CONTAINER_YAW), 0, Math.cos(CONTAINER_YAW));

export const CONTAINER_DROP = { start: 1.45, duration: 0.75, height: 3.2 };
export const CONTAINER_LANDS_AT = CONTAINER_DROP.start + CONTAINER_DROP.duration * 0.7;
export const DOORS = { start: 2.35, duration: 1.46 };
/** Cyan point light inside the container, ramped up as the doors open. */
export const INTERIOR_LIGHT = { start: 2.35, duration: 1.0, intensity: 2.2 };
/** Once the whale has settled, interior light + floor spill ease down to a subtle idle glow. */
export const CONTAINER_IDLE = { start: 6.2, duration: 1.2, level: 0.35 };
/** Hero container neon vs the standard level, so it still reads in the pulled-back overview. */
export const CONTAINER_NEON_BOOST = 1.5;

// ── Whale ─────────────────────────────────────────────────────────────────
/** Full size in the hero (whale.glb is 2.83 long natively → ~4.5 world units): the centerpiece. */
export const WHALE_SCALE = 1.6;
/**
 * Absolute scale inside the container ("scale cheat"): 0.79 long × 0.32 wide, so it fits the
 * container's ~1.0 × 0.38 interior. Grows to WHALE_SCALE as it swims out.
 */
export const WHALE_START_SCALE = 0.28;
export const WHALE_SWIM = { start: 2.95, duration: 3.9 };
/** Path progress (0–1) over which the whale grows from start scale to full size. */
export const WHALE_GROW = { from: 0.1, to: 0.62 };
/** Minis pop onto its back, one after another, as it settles. */
export const MINIS_POP = { at: 0.86, stagger: 0.14, duration: 0.45 };

const along = (d: number, y: number) => CONTAINER_POS.clone().addScaledVector(DOOR_DIR, d).setY(y);

/**
 * Swim path: out through the doors heading front-right (three-quarter view), a wide banking
 * right-hand turn while rising, then in over the cluster to settle facing left, toward the
 * hero text, in a three-quarter profile. Never pointed straight at the camera for long.
 */
export const WHALE_PATH = new CatmullRomCurve3(
  [
    along(-0.15, 0.42), // inside the container
    along(0.8, 0.55), // just through the doors
    new Vector3(0.45, 0.95, 2.05),
    new Vector3(2.45, 1.7, 0.8),
    new Vector3(2.0, 2.9, -2.2),
    // Settled hover: centred above and just behind the helm wheel (from the raised camera,
    // "behind" also reads as "higher", so the two never overlap). Arrives heading left and ~40°
    // toward camera: a three-quarter profile that shows its back (every mini reads) without
    // ever facing the camera head-on.
    new Vector3(0.2, 3.6, -0.95),
  ],
  false,
  "centripetal",
);

/** Pitch and bank limits (radians) so the motion reads as swimming, not flipping. */
export const MAX_PITCH = 0.28;
export const MAX_BANK = 0.42;
/** How strongly turning rolls the whale into the turn. */
export const BANK_GAIN = 1.6;

// ── Camera ────────────────────────────────────────────────────────────────
export interface CameraKey {
  /** Seconds from intro start */
  t: number;
  position: Vector3;
  target: Vector3;
}

/** Overview framing (cluster in the lower half, whale hover above). */
export const CAMERA_HOME: Omit<CameraKey, "t"> = {
  position: new Vector3(0, 6.9, 12.8),
  target: new Vector3(0, 0.75, 0),
};

const DOOR_FOCUS = along(0.55, 0.42);
/** Close-up yaw: 35° off the door axis — sees into the container, still a three-quarter view. */
const CLOSE_UP_YAW = CONTAINER_YAW - (35 * Math.PI) / 180;
const CLOSE_UP: Omit<CameraKey, "t"> = {
  position: DOOR_FOCUS.clone().add(new Vector3(Math.sin(CLOSE_UP_YAW) * 4.1, 1.85, Math.cos(CLOSE_UP_YAW) * 4.1)),
  target: DOOR_FOCUS,
};

/**
 * Push in on the container as it lands, hold through the doors and the whale's exit,
 * then pull back to the overview while the whale grows and rises.
 */
export const CAMERA_KEYS: CameraKey[] = [
  { t: 0, ...CAMERA_HOME },
  { t: 1.9, ...CAMERA_HOME },
  { t: 3.0, ...CLOSE_UP },
  { t: 4.0, ...CLOSE_UP },
  { t: 6.6, ...CAMERA_HOME },
];

/**
 * How much the camera's look-at follows the whale (0 = keyframed target, 1 = the whale), so it
 * never leaves the frame while it swings out toward the camera and banks round.
 */
export const WHALE_TRACKING: Array<{ t: number; weight: number }> = [
  { t: 3.4, weight: 0 },
  { t: 4.3, weight: 0.7 },
  { t: 5.6, weight: 0.55 },
  { t: 6.8, weight: 0 },
];

/** Floor spill: additive light pool on the deck in front of the doors. */
export const SPILL = {
  centre: along(0.85, CONTAINER_POS.y + 0.012),
  radius: 0.8,
  opacity: 0.26,
};
