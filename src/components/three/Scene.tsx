"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Grid, useGLTF } from "@react-three/drei";
import { DRACO_PATH, MODELS } from "./assets";
import { Bloom } from "./Bloom";
import { Cluster } from "./cluster/Cluster";
import { HelmWheel } from "./HelmWheel";
import { IntroClock, IntroContext } from "./intro";
import { Lighting } from "./Lighting";

interface Props {
  mobile: boolean;
  reducedMotion: boolean;
}

const LOOK_AT: [number, number, number] = [0, -0.25, 0];

/** Hero scene: cluster + helm wheel (3b). Container + whale land in 3c. */
export function Scene({ mobile, reducedMotion }: Props) {
  // One call per URL: an array call is cached under its own key and would re-download everything.
  // Suspends until every model is parsed, so the boot overlay covers the whole load.
  useGLTF(MODELS.container, DRACO_PATH);
  useGLTF(MODELS.whale, DRACO_PATH);

  const clock = useMemo(() => new IntroClock(reducedMotion), [reducedMotion]);
  const camera = useThree((s) => s.camera);
  useEffect(() => camera.lookAt(...LOOK_AT), [camera]);

  return (
    <IntroContext value={clock}>
      <Lighting />
      <Grid
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
      <Cluster mobile={mobile} />
      <HelmWheel />
      <Bloom strength={mobile ? 0.26 : 0.32} />
    </IntroContext>
  );
}
