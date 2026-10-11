"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import type { Group } from "three";
import { HERO_SET_LAYER, markHeroSet } from "./whaleSilhouette";

/**
 * Everything in the hero except the whale: its drawables move to HERO_SET_LAYER (lights stay on
 * the default layer), which the camera draws until the scroll-out fade reaches 0 (Bloom.tsx).
 */
export function HeroSet({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  const get = useThree((s) => s.get);
  useEffect(() => {
    get().camera.layers.enable(HERO_SET_LAYER);
    if (ref.current) markHeroSet(ref.current);
  }, [get]);
  return <group ref={ref}>{children}</group>;
}
