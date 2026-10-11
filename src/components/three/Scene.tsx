"use client";

import { useMemo } from "react";
import { Bloom } from "./Bloom";
import { CameraRig } from "./CameraRig";
import { Cluster } from "./cluster/Cluster";
import { HelmWheel } from "./HelmWheel";
import { HeroContainer } from "./hero/HeroContainer";
import { MiniDrop } from "./hero/MiniDrop";
import { Whale } from "./hero/Whale";
import { IntroClock, IntroContext } from "./intro";
import { IntroTicker } from "./IntroTicker";
import { FloorGrid } from "./FloorGrid";
import { Lighting } from "./Lighting";
import { usePointerFollow } from "./pointer";
import { HeroSet } from "./HeroSet";

interface Props {
  mobile: boolean;
  reducedMotion: boolean;
  /** Desktop with motion: minis drop into the project cards on scroll (4a) */
  drop: boolean;
}

/**
 * Hero scene. Every model component calls useModel (useGLTF) itself (one call per URL), so this whole tree
 * suspends until all models are parsed and the boot overlay covers the full load.
 */
export function Scene({ mobile, reducedMotion, drop }: Props) {
  const clock = useMemo(() => new IntroClock(reducedMotion), [reducedMotion]);
  // Mouse-follow on desktop only (no mouse on mobile; nothing moves under reduced motion).
  usePointerFollow(!mobile && !reducedMotion);

  return (
    <IntroContext value={clock}>
      <IntroTicker />
      <CameraRig />
      <Lighting />
      <HeroSet>
        <FloorGrid />
        <Cluster mobile={mobile} />
        <HelmWheel />
        <HeroContainer />
      </HeroSet>
      <Whale />
      {drop && <MiniDrop />}
      <Bloom strength={mobile ? 0.26 : 0.32} />
    </IntroContext>
  );
}
