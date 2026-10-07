"use client";

import { useFrame } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { CAMERA_FIT, CAMERA_KEYS, IDLE, WHALE_SETTLED_AT, WHALE_TRACKING } from "./hero/choreography";
import { whaleTrack } from "./hero/tracking";
import { power2InOut, span, useIntroClock } from "./intro";
import { canvasOrigin, heroLayout } from "./heroLayout";
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

const near = (a: number, b: number) => Math.abs(a - b) < 1e-4;

/**
 * Lens + framing: fit the stage frame (desktop, lens-shifted) or the whole canvas (mobile).
 * Compares against the camera's actual values every frame (no cached key): R3F resets
 * `camera.aspect` on its own when it handles a resize.
 */
function frameCamera(camera: PerspectiveCamera, w: number, h: number) {
  const { fullBleed, stage: page } = heroLayout;
  // Stage in canvas px. The desktop canvas is fixed to the viewport, so this follows the scroll
  // and the hero scene scrolls with the page.
  const o = canvasOrigin();
  const sx0 = page.x0 - o.x;
  const sy0 = page.y0 - o.y;
  const stageW = page.x1 - page.x0;
  const stageH = page.y1 - page.y0;
  const sw = stageW * (1 + 2 * BLEED_X);
  const sh = stageH * (1 + 2 * BLEED_Y);

  if (fullBleed && sw > 0 && sh > 0) {
    const aspect = sw / sh;
    const fov = fitFov(aspect);
    const ox = -(sx0 - stageW * BLEED_X);
    const oy = -(sy0 - stageH * BLEED_Y);
    const v = camera.view;
    const same =
      v?.enabled &&
      near(camera.aspect, aspect) &&
      near(camera.fov, fov) &&
      near(v.fullWidth, sw) &&
      near(v.fullHeight, sh) &&
      near(v.offsetX, ox) &&
      near(v.offsetY, oy) &&
      near(v.width, w) &&
      near(v.height, h);
    if (same) return;
    camera.aspect = aspect;
    camera.fov = fov;
    // The frame is the "full image"; the canvas is a window onto it extending past its edges.
    camera.setViewOffset(sw, sh, ox, oy, w, h);
  } else {
    const aspect = w / h;
    const fov = fitFov(aspect);
    if (!camera.view?.enabled && near(camera.aspect, aspect) && near(camera.fov, fov)) return;
    camera.clearViewOffset();
    camera.aspect = aspect;
    camera.fov = fov;
  }
  camera.updateProjectionMatrix();
}
