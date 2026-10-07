"use client";

import { useFrame } from "@react-three/fiber";
import { useIntroClock } from "./intro";
import { smoothPointer } from "./pointer";

/**
 * Runs first every rendered frame (priority −1): advances the intro clock and eases the
 * mouse-follow target, so every reader sees the same values this frame.
 */
export function IntroTicker() {
  const clock = useIntroClock();
  useFrame((_, delta) => {
    clock.tick(delta);
    smoothPointer(delta);
  }, -1);
  return null;
}
