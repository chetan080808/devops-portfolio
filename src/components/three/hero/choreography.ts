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
export const INTERIOR_LIGHT = { start: 2.35, duration: 1.0, intensity: 1.3 };
/** Once the whale has settled, interior light + floor spill ease down to a subtle idle glow. */
export const CONTAINER_IDLE = { start: 6.2, duration: 1.2, level: 0.55 };
/** Hero container neon vs the standard level, so it still reads in the pulled-back overview. */
export const CONTAINER_NEON_BOOST = 2.2;

/** Camera home is pulled back by this factor (see CAMERA_HOME); the whale scales up to match. */
export const HOME_ZOOM = 1.4;

// ── Whale ─────────────────────────────────────────────────────────────────
/** Full size in the hero (whale.glb is 2.83 long natively → ~4.5 world units): the centerpiece. */
export const WHALE_SCALE = 1.88 * HOME_ZOOM;
/**
 * Absolute scale inside the container ("scale cheat"): 0.79 long × 0.32 wide, so it fits the
 * container's ~1.0 × 0.38 interior. Grows to WHALE_SCALE as it swims out.
 */
export const WHALE_START_SCALE = 0.28;
export const WHALE_SWIM = { start: 2.85, duration: 4.0 };
/** When the whale reaches its hover; idle motion fades in from here. */
export const WHALE_SETTLED_AT = WHALE_SWIM.start + WHALE_SWIM.duration;

/** Camera parallax from the mouse (desktop), faded in after the intro. */
export const IDLE = {
  fadeIn: 1.8,
  parallax: { x: 0.22, y: 0.12 },
};

/**
 * After the intro the whale is driven by a spring controller (hero/whaleController.ts):
 * it swims toward the cursor inside a roaming zone, or along a lazy figure-eight around its home
 * point when the mouse is idle (> 3 s), off the page, on touch, or under reduced motion.
 */
export const SWIM = {
  /** Depth plane the whale swims in (world z) */
  z: -0.6,
  /** Position spring (slightly underdamped: lags, then settles with a hint of overshoot) */
  spring: { stiffness: 6.5, damping: 4.1 },
  maxSpeed: 3.4,
  /**
   * Heading = π + a (a = 0: swimming straight away, back and tail to camera). a = +side faces
   * left, −side faces right, both ~16° into three-quarter view. Turns run through a = 0, so it
   * never faces the camera head-on (|a| ≤ side + 0.1 < π).
   */
  side: Math.PI / 2 + 0.27,
  /** Stiff, near-critically damped: the "away from camera" part of a turn passes in ~0.3 s */
  turn: { stiffness: 42, damping: 12.5 },
  bankGain: 0.2,
  maxBank: 0.3,
  maxPitch: 0.35, // ~20°
  /** Hard layout limits (canvas px), with margin over the 32 / 40 px spec for frame lag + bob */
  textGap: 34,
  headroom: 46,
  foldMargin: 16,
  rightMargin: 24,
  /** Gap kept above the cluster's top edge (helm wheel / nodes) */
  clusterGap: 16,
  /** Smallest shrink-to-fit factor on short screens */
  minFit: 0.7,
  /** 4a transition: slow, critically damped spring + gentle turns (no overshoot, no twisting) */
  calm: { stiffness: 2.2, damping: 3.0, maxSpeed: 1.6, turnStiffness: 5, turnDamping: 4.5 },
  /** 4a: hover this far above the project cards while the minis drop; max size there */
  drop: { gap: 26, maxFit: 0.95, z: 1.2, x: 0.74 },
  /** Vertical swimming room (px) the shrink-to-fit always leaves on short screens */
  minTravelY: 90,
  /** Idle figure-eight around home (px), home centre at this share of the viewport width */
  idle: { period: 14, x: 70, y: 16, homeX: 0.575 },
  bob: { amplitude: 0.07, period: 3.6, px: 6 },
  /** Hover tail flick */
  flick: { duration: 0.8, cooldown: 1.5, tailBoost: 2.6, roll: 0.22 },
};

/** Minis pop onto its back, one after another, as it settles. */
export const MINIS_POP = { at: 0.86, stagger: 0.14, duration: 0.45 };

const along = (d: number, y: number) => CONTAINER_POS.clone().addScaledVector(DOOR_DIR, d).setY(y);

/**
 * Swim path. Out through the doors heading front-right (three-quarter view), a long, gently
 * climbing sweep to the right, a brief turn behind the cluster, then in over it to settle facing
 * left (toward the hero text). The climb (0.4 → ~3.9) is spread over ~10 units of travel so the
 * nose never points more than ~22° up.
 */
export const WHALE_PATH = new CatmullRomCurve3(
  [
    along(-0.15, 0.4), // inside the container
    along(1.1, 0.42), // tail just past the door plane
    // Climb while swimming sideways (seen side-on, reads as a gentle rise; pitch capped at 22°).
    // The brief turn away from the camera behind the cluster is nearly level: seen tail-on from
    // the low camera, any climb there would read as pointing straight up.
    new Vector3(1.4, 1.35, 1.7),
    new Vector3(3.3, 2.5, 0.55),
    new Vector3(2.85, 2.62, -0.3),
    new Vector3(1.6, 3.3, -0.55),
    // Settled hover: centred above and just behind the helm wheel.
    new Vector3(0.1, 3.85, -0.6),
  ],
  false,
  "centripetal",
);

const PATH_LEN = WHALE_PATH.getLength();
/**
 * Distance along the path (world units) over which the whale grows. It keeps its small
 * in-container size until its tail (0.4 behind its centre) is clear of the door plane
 * (0.48 in front of the container's centre), so it never clips the walls or roof.
 */
export const WHALE_GROW = { from: 1.25 / PATH_LEN, to: 6.5 / PATH_LEN };

/** Pitch and bank limits (radians) so the motion reads as swimming, not flipping. */
export const MAX_PITCH = 0.38; // ~22°
export const MAX_BANK = 0.28;
/** How strongly turning rolls the whale into the turn. */
export const BANK_GAIN = 1.6;

// ── Camera ────────────────────────────────────────────────────────────────
export interface CameraKey {
  /** Seconds from intro start */
  t: number;
  position: Vector3;
  target: Vector3;
}

/**
 * Lens: fit the scene to the canvas WIDTH (constant horizontal FOV) so the whale is the same
 * share of the hero column at every window size; vertical FOV is derived from the aspect and
 * clamped so short, wide screens never crop the cluster or the whale.
 */
export const CAMERA_FIT = { hfov: 46, minVfov: 33, maxVfov: 50 };

/** Overview framing (cluster in the lower half, whale hover above). */
/**
 * ~14° above the scene. Pulled back (×HOME_ZOOM) so the cluster is smaller and sits lower: the
 * whale's free swimming band above it matters more. The whale is scaled up by the same factor,
 * so it keeps its on-screen size.
 */
const HOME_TARGET = new Vector3(0, 2.0, 0);
export const CAMERA_HOME: Omit<CameraKey, "t"> = {
  position: HOME_TARGET.clone().add(new Vector3(0, 3.5, 12.4).multiplyScalar(HOME_ZOOM)),
  target: HOME_TARGET.clone().add(new Vector3(0, 1.35, 0)),
};

const DOOR_FOCUS = along(0.55, 0.42);
/**
 * Close-up: 18° off the door axis (on the camera side) — the open doorway faces the camera at a
 * three-quarter angle. Low and tight, aimed a little left of the doorway, so the helm wheel
 * (behind and to the right) stays out of frame and nothing sits between camera and doorway.
 */
const CLOSE_UP_YAW = CONTAINER_YAW - (18 * Math.PI) / 180;
const CLOSE_UP: Omit<CameraKey, "t"> = {
  position: DOOR_FOCUS.clone().add(new Vector3(Math.sin(CLOSE_UP_YAW) * 2.35, 0.62, Math.cos(CLOSE_UP_YAW) * 2.35)),
  target: DOOR_FOCUS.clone().add(new Vector3(-0.25, 0.02, 0)),
};

/**
 * Push in on the container as it lands, hold through the doors and the whale's exit,
 * then pull back to the overview while the whale grows and rises.
 */
export const CAMERA_KEYS: CameraKey[] = [
  { t: 0, ...CAMERA_HOME },
  { t: 1.9, ...CAMERA_HOME },
  { t: 3.0, ...CLOSE_UP },
  { t: 3.75, ...CLOSE_UP },
  { t: 5.4, ...CAMERA_HOME },
];

/**
 * How much the camera's look-at follows the whale (0 = keyframed target, 1 = the whale), so it
 * never leaves the frame while it swings out toward the camera and banks round.
 */
export const WHALE_TRACKING: Array<{ t: number; weight: number }> = [
  { t: 3.4, weight: 0 },
  { t: 4.2, weight: 0.45 },
  { t: 5.3, weight: 0.4 },
  { t: 6.5, weight: 0 },
];

/** Floor spill: additive light pool on the deck in front of the doors. */
export const SPILL = {
  centre: along(0.85, CONTAINER_POS.y + 0.012),
  radius: 0.8,
  opacity: 0.26,
};
