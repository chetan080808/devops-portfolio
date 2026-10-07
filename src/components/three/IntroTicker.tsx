"use client";

import { useFrame } from "@react-three/fiber";
import { useIntroClock } from "./intro";

/** Advances the intro clock once per rendered frame, before anything reads it (priority −1). */
export function IntroTicker() {
  const clock = useIntroClock();
  useFrame((_, delta) => clock.tick(delta), -1);
  return null;
}
