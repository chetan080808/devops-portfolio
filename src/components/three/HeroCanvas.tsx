"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { sceneStore } from "@/lib/sceneStore";
import { startAssetLoading } from "./assets";
import { installThreeConsoleFilter } from "./consoleFilter";
import { isSoftwareRenderer } from "@/lib/webglSupport";
import { precompile } from "./precompile";
import { Scene } from "./Scene";

// Runs when this lazy chunk evaluates — model downloads start before React even mounts the canvas.
installThreeConsoleFilter();
startAssetLoading();

interface Props {
  mobile: boolean;
  /** Skip the intro choreography and render the settled scene */
  reducedMotion: boolean;
  /** Desktop with motion: minis drop into the project cards on scroll */
  drop: boolean;
  /** False while the hero is scrolled out of view: stop rendering entirely */
  active: boolean;
}

/** The lazy-loaded R3F canvas for the hero. Default export for `next/dynamic`. */
export default function HeroCanvas({ mobile, reducedMotion, drop, active }: Props) {
  // No frames until every shader is compiled (ReadySignal): otherwise the first frames compile
  // them synchronously, one long main-thread task each.
  const [warm, setWarm] = useState(false);
  // Device pixel ratio after the pixel budget (PixelBudget); starts at the plain range.
  const [dpr, setDpr] = useState<number | null>(null);
  return (
    <Canvas
      // `flat` = no tone mapping: neon stays saturated; bloom provides the glow.
      flat
      // R3F re-applies this prop on every render, so the budgeted value has to be the prop itself.
      dpr={dpr ?? (mobile ? DPR_MOBILE : DPR_DESKTOP)}
      frameloop={active && warm ? "always" : "never"}
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 6.9, 12.8], fov: 32, near: 0.1, far: 60 }}
      aria-hidden="true"
      // Never intercept clicks: on desktop this canvas is fixed over the whole page. (R3F sets
      // pointer-events: auto on its wrapper by default.) The scene reads the mouse from window.
      style={{ pointerEvents: "none" }}
      // Shader info-log checks cost compile time and surface harmless driver warnings (ANGLE X4122).
      onCreated={({ gl }) => {
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        // CPU-rendered WebGL: hand over to the static hero (HeroStage unmounts this canvas).
        if (isSoftwareRenderer(gl.getContext())) sceneStore.set({ failed: true, failReason: "no-gpu" });
      }}
    >
      <Suspense fallback={null}>
        <Scene mobile={mobile} reducedMotion={reducedMotion} drop={drop} />
        <ReadySignal onWarm={setWarm} />
      </Suspense>
      <PixelBudget maxPixels={mobile ? MOBILE_PIXELS : DESKTOP_PIXELS} maxDpr={(mobile ? DPR_MOBILE : DPR_DESKTOP)[1]} onDpr={setDpr} />
    </Canvas>
  );
}

/**
 * Canvas pixel budget: the desktop canvas spans the whole viewport, so at 1920×1080 with a 1.5
 * device pixel ratio it was 4.6 MP + bloom (42–46 fps measured). Above the budget the DPR drops
 * just enough to fit (never below 1); smaller windows keep the full device pixel ratio.
 */
const DPR_DESKTOP: [number, number] = [1, 2];
const DPR_MOBILE: [number, number] = [1, 1.5];
const DESKTOP_PIXELS = 2.3e6;
const MOBILE_PIXELS = 1.2e6;

function PixelBudget({ maxPixels, maxDpr, onDpr }: { maxPixels: number; maxDpr: number; onDpr: (dpr: number) => void }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    if (width === 0 || height === 0) return;
    const device = Math.min(window.devicePixelRatio || 1, maxDpr);
    const fit = Math.sqrt(maxPixels / (width * height));
    // Snapped down to 0.25 steps: tiny resizes don't reallocate the render targets, and odd ratios
    // (e.g. 1.05 → a 1999×1134 buffer behind a 1904.67 px canvas) measured ~2 fps on a laptop GPU.
    onDpr(Math.max(1, Math.floor(Math.min(device, fit) * 4) / 4));
  }, [width, height, maxPixels, maxDpr, onDpr]);
  return null;
}

/**
 * Mounts once every model has resolved: compiles every shader (in small steps, see precompile.ts),
 * then starts the render loop and flags the scene ready after its first frame.
 */
function ReadySignal({ onWarm }: { onWarm: (warm: true) => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    precompile(gl, scene, camera, () => cancelled)
      .catch((err) => console.warn("[scene] shader warm-up failed, compiling on first draw", err))
      .finally(() => {
        if (cancelled) return;
        onWarm(true);
        raf = requestAnimationFrame(() => requestAnimationFrame(() => sceneStore.set({ sceneReady: true })));
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera, onWarm]);
  return null;
}
