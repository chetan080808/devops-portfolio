"use client";

import { useFrame } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { CAMERA_FIT, CAMERA_KEYS, IDLE, WHALE_SETTLED_AT, WHALE_TRACKING } from "./hero/choreography";
import { whaleTrack } from "./hero/tracking";
import { power2InOut, span, useIntroClock } from "./intro";
import { heroLayout } from "./heroLayout";
import { pointer } from "./pointer";

/**
 * The "frame" the scene is composed for: the right-column stage plus the bleed it always had
 * (9% / 7% per side). On desktop the canvas is the whole hero, so a lens shift (setViewOffset)
 * renders that frame in exactly the same place while the canvas extends left into the gap.
 */
const BLEED_X = 0.09;
const BLEED_Y = 0.07;

const position = new Vector3();
const target = new Vector3();

/** Eased value of a piecewise schedule at time t (holds the ends). */
function sample<K extends { t: number }>(keys: K[], t: number, lerp: (a: K, b: K, p: number) => void) {
  let i = keys.findIndex((k) => k.t > t);
  if (i === -1) i = keys.length;
  const a = keys[Math.max(0, i - 1)];
  const b = keys[Math.min(i, keys.length - 1)];
  lerp(a, b, a === b ? 1 : power2InOut(span(t, a.t, b.t - a.t)));
}

/** Vertical FOV (deg) that gives CAMERA_FIT.hfov across a canvas of this aspect, clamped. */
function fitFov(aspect: number) {
  const half = MathUtils.degToRad(CAMERA_FIT.hfov / 2);
  const v = MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / aspect));
  return MathUtils.clamp(v, CAMERA_FIT.minVfov, CAMERA_FIT.maxVfov);
}

/** Drives the camera through the hero keyframes, with its look-at partly tracking the whale. */
export function CameraRig() {
  const clock = useIntroClock();

  useFrame((state) => {
    const t = Math.max(0, clock.time());
    sample(CAMERA_KEYS, t, (a, b, p) => {
      position.lerpVectors(a.position, b.position, p);
      target.lerpVectors(a.target, b.target, p);
    });
    let weight = 0;
    sample(WHALE_TRACKING, t, (a, b, p) => (weight = MathUtils.lerp(a.weight, b.weight, p)));
    if (weight > 0) target.lerp(whaleTrack, weight);

    // Idle parallax from the mouse (zero on mobile / reduced motion), faded in after the intro.
    const idle = MathUtils.smoothstep(t, WHALE_SETTLED_AT, WHALE_SETTLED_AT + IDLE.fadeIn);
    position.x += pointer.smoothed.x * IDLE.parallax.x * idle;
    position.y += pointer.smoothed.y * IDLE.parallax.y * idle;

    const camera = state.camera;
    if (camera instanceof PerspectiveCamera) frameCamera(camera, state.size.width, state.size.height);
    camera.position.copy(position);
    camera.lookAt(target);
  });

  return null;
}

let lastKey = "";

/** Lens + framing: fit the stage frame (desktop, lens-shifted) or the whole canvas (mobile). */
function frameCamera(camera: PerspectiveCamera, w: number, h: number) {
  const { fullBleed, stage } = heroLayout;
  const sw = (stage.x1 - stage.x0) * (1 + 2 * BLEED_X);
  const sh = (stage.y1 - stage.y0) * (1 + 2 * BLEED_Y);
  const useFrame = fullBleed && sw > 0 && sh > 0;
  const key = useFrame ? `${w}|${h}|${stage.x0}|${stage.y0}|${sw}|${sh}` : `${w}|${h}`;
  if (key === lastKey) return;
  lastKey = key;
  if (useFrame) {
    camera.aspect = sw / sh;
    camera.fov = fitFov(sw / sh);
    const fx = stage.x0 - (stage.x1 - stage.x0) * BLEED_X;
    const fy = stage.y0 - (stage.y1 - stage.y0) * BLEED_Y;
    // The frame is the "full image"; the canvas is a window onto it extending past its edges.
    camera.setViewOffset(sw, sh, -fx, -fy, w, h);
  } else {
    camera.clearViewOffset();
    camera.aspect = w / h;
    camera.fov = fitFov(w / h);
  }
  camera.updateProjectionMatrix();
}

