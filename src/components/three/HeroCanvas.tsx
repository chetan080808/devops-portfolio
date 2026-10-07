"use client";

import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { sceneStore } from "@/lib/sceneStore";
import { startAssetLoading } from "./assets";
import { Scene } from "./Scene";

// Runs when this lazy chunk evaluates — model downloads start before React even mounts the canvas.
startAssetLoading();

interface Props {
  mobile: boolean;
  /** False while the hero is scrolled out of view: stop rendering entirely */
  active: boolean;
}

/** The lazy-loaded R3F canvas for the hero. Default export for `next/dynamic`. */
export default function HeroCanvas({ mobile, active }: Props) {
  return (
    <Canvas
      // `flat` = no tone mapping: neon stays saturated; bloom provides the glow.
      flat
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 1.6, 7], fov: 35, near: 0.1, far: 60 }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Scene mobile={mobile} />
        <ReadySignal />
      </Suspense>
    </Canvas>
  );
}

/** Mounts once every model has resolved; flags the scene ready after its first frame. */
function ReadySignal() {
  useEffect(() => {
    const raf = requestAnimationFrame(() => sceneStore.set({ sceneReady: true }));
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
