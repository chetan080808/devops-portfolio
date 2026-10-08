"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import type { Mesh } from "three";
import { scrollStory } from "@/lib/scrollStory";

/**
 * Subtle infinite floor grid under the cluster. Hidden once the whale leaves the hero (4a): the
 * whale's always-visible mask region would otherwise show stray grid lines over Deployments.
 */
export function FloorGrid() {
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = scrollStory.approach < 0.15;
  });
  return (
    <Grid
      ref={ref}
      position={[0, -0.04, 0]}
      args={[30, 30]}
      cellSize={0.5}
      cellThickness={0.6}
      cellColor="#16233a"
      sectionSize={2.5}
      sectionThickness={1}
      sectionColor="#1d4d63"
      fadeDistance={13}
      fadeStrength={2.2}
      infiniteGrid
    />
  );
}
