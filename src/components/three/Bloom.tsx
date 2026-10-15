"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2 } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FXAAPass } from "three/examples/jsm/postprocessing/FXAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createHeroMaskPass, updateHeroMask } from "./heroMaskPass";
import { layerOverrides, passMaterials, postMaterials, sceneTarget } from "./precompile";
import { HERO_SET_LAYER, WHALE_LAYER, createSilhouetteTarget, renderSilhouette, silhouetteMaterial } from "./whaleSilhouette";

/**
 * Weight of each blur level, tightest first. Three's default (1, .8, .6, .4, .2) lets the widest
 * levels wash a teal haze over the whole frame when lots of neon is on screen; we keep the glow
 * hugging the edges instead.
 */
const MIP_WEIGHTS = [1, 0.7, 0.32, 0.1, 0.02];

type AaMode = "smaa" | "fxaa" | "off";

/**
 * Anti-aliasing after tone mapping: the composer renders without MSAA (MSAA halved the fps at
 * 1920×1080), so thin neon edges crawled while moving. FXAA (one pass) costs ~1 fps at
 * 1920×1080; SMAA (three passes) cost ~6, see DECISIONS D-50. `?aa=smaa|fxaa|off` overrides it
 * for A/B measurements.
 */
const AA_DEFAULT: AaMode = "fxaa";
function aaMode(): AaMode {
  const q = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("aa");
  return q === "smaa" || q === "fxaa" || q === "off" ? q : AA_DEFAULT;
}

interface Props {
  strength?: number;
  /** 0 = use MIP_WEIGHTS as-is; higher values flatten them toward a wider glow */
  radius?: number;
  /** Linear luminance above which pixels glow. Neon/HDR materials sit well above 1. */
  threshold?: number;
}

/**
 * Bloom via three's own postprocessing (no extra dependency). Takes over rendering
 * (useFrame priority 1); OutputPass does the linear → sRGB conversion at the end.
 */
export function Bloom({ strength = 0.45, radius = 0, threshold = 0.55 }: Props) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  // Settings only change between mobile/desktop, so rebuilding on change is fine.
  const { composer, mask, silhouette } = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new Vector2(256, 256), strength, radius, threshold);
    bloom.compositeMaterial.uniforms.bloomFactors.value = MIP_WEIGHTS;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // On the display-referred (sRGB) image, where edge detection matches what you see.
    const aa = aaMode();
    if (aa === "smaa") composer.addPass(new SMAAPass());
    else if (aa === "fxaa") composer.addPass(new FXAAPass());
    // Hides the hero scene behind the text / below the hero (see heroMaskPass).
    const mask = createHeroMaskPass();
    composer.addPass(mask);
    const silhouette = createSilhouetteTarget();
    mask.uniforms.tWhaleSil.value = silhouette.texture;
    return { composer, mask, silhouette };
  }, [gl, scene, camera, strength, radius, threshold]);

  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    // Half resolution is plenty for a mask (it's dilated and feathered anyway).
    silhouette.setSize(Math.max(1, Math.round((size.width * dpr) / 2)), Math.max(1, Math.round((size.height * dpr) / 2)));
  }, [composer, silhouette, dpr, size.width, size.height]);

  // Let the boot-time shader warm-up compile the passes' materials too, each for the target it
  // draws into (see precompile.ts): the scene renders into the composer's buffer, every pass but
  // the last (the mask, drawn to the canvas) into a render target, the silhouette into its own.
  useEffect(() => {
    sceneTarget.current = composer.readBuffer;
    const last = composer.passes.length - 1;
    const materials = composer.passes.flatMap((pass, i) =>
      passMaterials(pass).map((m) => [m, i === last ? null : composer.readBuffer] as const),
    );
    materials.forEach(([m, target]) => postMaterials.set(m, target));
    const override = { material: silhouetteMaterial, layer: WHALE_LAYER, target: silhouette };
    layerOverrides.add(override);
    return () => {
      if (sceneTarget.current === composer.readBuffer) sceneTarget.current = null;
      materials.forEach(([m]) => postMaterials.delete(m));
      layerOverrides.delete(override);
      composer.dispose();
      silhouette.dispose();
    };
  }, [composer, silhouette]);

  useFrame((state, delta) => {
    const fade = updateHeroMask(mask, state.size.width, state.size.height);
    // Faded out completely: skip drawing the hero set (see whaleSilhouette.ts).
    if (fade > 0) state.camera.layers.enable(HERO_SET_LAYER);
    else state.camera.layers.disable(HERO_SET_LAYER);
    // Mid-fade: the whale's own pixels for the mask.
    if (mask.uniforms.uSilOn.value > 0) renderSilhouette(state.gl, scene, camera, silhouette);
    composer.render(delta);
  }, 1);
  return null;
}
