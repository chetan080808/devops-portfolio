"use client";

import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { CAMERA_KEYS, WHALE_TRACKING } from "./hero/choreography";
import { whaleTrack } from "./hero/tracking";
import { power2InOut, span, useIntroClock } from "./intro";

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

    state.camera.position.copy(position);
    state.camera.lookAt(target);
  });

  return null;
}
