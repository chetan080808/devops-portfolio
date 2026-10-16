"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSceneState } from "@/hooks/useSceneState";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { STILL_CAPTURE } from "@/lib/stillCapture";
import { sceneStore } from "@/lib/sceneStore";
import { startAssetLoading } from "./assets";
import { installThreeConsoleFilter } from "./consoleFilter";
import { isSoftwareRenderer } from "@/lib/webglSupport";
import { preloadEnvironment } from "./Lighting";
import { precompile } from "./precompile";
import { Scene } from "./Scene";

// Runs when this lazy chunk evaluates — model downloads start before React even mounts the canvas.
installThreeConsoleFilter();
startAssetLoading();
preloadEnvironment();

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
  // No frames behind the boot screen either: it covers the canvas, and its exit transition needs
  // the GPU. The intro starts from an empty stage when the boot is done anyway.
  const bootDone = useSceneState((s) => s.bootDone);
  // Device pixel ratio after the pixel budget (PixelBudget); starts at the plain range.
  const [dpr, setDpr] = useState<number | null>(null);
  // Capture mode (?still): the loop stops at the first visible frame and must stay stopped.
  const [captured, setCaptured] = useState(false);
  return (
    <Canvas
      // `flat` = no tone mapping: neon stays saturated; bloom provides the glow.
      flat
      // R3F re-applies this prop on every render, so the budgeted value has to be the prop itself.
      dpr={dpr ?? (mobile ? DPR_MOBILE : DPR_DESKTOP)}
      frameloop={active && warm && bootDone && !captured ? "always" : "never"}
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
        <FrameGate />
        {STILL_CAPTURE && <StopAtFirstVisibleFrame onStop={setCaptured} />}
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
    // Progress for the boot (phones wait for the warm-up); only whole-percent changes are published.
    let shown = -1;
    const onProgress = (done: number, total: number) => {
      const pct = total > 0 ? Math.floor((done / total) * 100) : 0;
      if (pct === shown) return;
      shown = pct;
      sceneStore.set({ compileDone: done, compileTotal: total });
    };
    precompile(gl, scene, camera, () => cancelled, onProgress)
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

/** The first frame that reaches the screen (see FrameGate / framesShown). */
const FIRST_VISIBLE_FRAME = 2;

/**
 * The very first frame comes out opaque and dark (post-processing not settled yet): it is wiped to
 * transparent before it is presented, and framesShown flags the first real one. The canvas is
 * never hidden for this: a canvas that was hidden is only composited again once it presents a new
 * frame, which left a frame or two with neither the still nor the 3D (measured).
 */
function FrameGate() {
  const n = useRef(0);
  useFrame(({ gl }) => {
    n.current++;
    if (n.current < FIRST_VISIBLE_FRAME) {
      gl.setRenderTarget(null);
      gl.clear(true, true, true); // the canvas' clear colour is transparent (alpha: true)
    } else if (n.current === FIRST_VISIBLE_FRAME) sceneStore.set({ framesShown: true });
  }, 3);
  return null;
}

/** Capture mode (`?still`): stop at the first visible frame and hand it to the script (raw pixels + page rect). */
function StopAtFirstVisibleFrame({ onStop }: { onStop: (stopped: true) => void }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const n = useRef(0);
  useFrame(({ gl }) => {
    // The first frame anyone sees (FrameGate), i.e. the one the 3D takes over from the still with.
    if (++n.current < FIRST_VISIBLE_FRAME) return;
    // Right away (before the next rAF), and through the prop so a re-render keeps it stopped.
    setFrameloop("never");
    onStop(true);
    // Read in the same frame it was drawn (the drawing buffer isn't preserved after that), raw:
    // the buffer is premultiplied, and the glow is light ADDED over the page (colour > alpha),
    // which an ordinary (straight-alpha) PNG export clips. Rows are bottom-up.
    const ctx = gl.getContext();
    const w = ctx.drawingBufferWidth;
    const h = ctx.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.setRenderTarget(null);
    ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
    let bin = "";
    for (let i = 0; i < px.length; i += 0x8000) bin += String.fromCharCode(...px.subarray(i, i + 0x8000));
    const r = gl.domElement.getBoundingClientRect();
    (window as unknown as { __stillFrame: unknown }).__stillFrame = {
      raw: btoa(bin),
      size: { width: w, height: h },
      rect: { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height },
    };
  }, 3);
  return null;
}
