"use client";

import { useMemo } from "react";
import { Grid } from "@react-three/drei";
import { Bloom } from "./Bloom";
import { CameraRig } from "./CameraRig";
import { Cluster } from "./cluster/Cluster";
import { HelmWheel } from "./HelmWheel";
import { HeroContainer } from "./hero/HeroContainer";
import { Whale } from "./hero/Whale";
import { IntroClock, IntroContext } from "./intro";
import { IntroTicker } from "./IntroTicker";
import { Lighting } from "./Lighting";

interface Props {
  mobile: boolean;
  reducedMotion: boolean;
}

/**
 * Hero scene. Every model component calls useGLTF itself (one call per URL), so this whole tree
 * suspends until all models are parsed and the boot overlay covers the full load.
 */
export function Scene({ mobile, reducedMotion }: Props) {
  const clock = useMemo(() => new IntroClock(reducedMotion), [reducedMotion]);

  return (
    <IntroContext value={clock}>
      <IntroTicker />
      <CameraRig />
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
      <HeroContainer />
      <Whale />
      <Bloom strength={mobile ? 0.26 : 0.32} />
    </IntroContext>
  );
}
