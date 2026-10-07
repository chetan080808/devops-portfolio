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
  /** Skip the intro choreography and render the settled scene */
  reducedMotion: boolean;
  /** False while the hero is scrolled out of view: stop rendering entirely */
  active: boolean;
}

/** The lazy-loaded R3F canvas for the hero. Default export for `next/dynamic`. */
export default function HeroCanvas({ mobile, reducedMotion, active }: Props) {
  return (
    <Canvas
      // `flat` = no tone mapping: neon stays saturated; bloom provides the glow.
      flat
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 6.2, 11.2], fov: 32, near: 0.1, far: 60 }}
      aria-hidden="true"
      // Shader info-log checks cost compile time and surface harmless driver warnings (ANGLE X4122).
      onCreated={({ gl }) => (gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production")}
    >
      <Suspense fallback={null}>
        <Scene mobile={mobile} reducedMotion={reducedMotion} />
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
