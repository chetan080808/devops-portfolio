"use client";

import { useEffect, useMemo } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useLoader, useThree } from "@react-three/fiber";
import { CubeUVReflectionMapping, LinearFilter, PMREMGenerator, SRGBColorSpace, TextureLoader, type CubeTexture } from "three";
import { ENV_BAKE } from "./envBake";

/** `?bake-env` (scripts/bake-env.mjs): build the environment live and expose it for baking. */
const BAKING = typeof location !== "undefined" && new URLSearchParams(location.search).has("bake-env");

/**
 * Dark studio: a cool key, cyan/violet rims, and an environment from three light panels so the
 * dark metal has something to reflect.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.45} color="#9a94c7" />
      <directionalLight position={[4, 7, 5]} intensity={1.8} color="#e2e4ff" />
      {/* Cool rim from behind/above: separates dark silhouettes (the whale) from the page. */}
      <directionalLight position={[-3, 6, -7]} intensity={2.2} color="#9fb4ff" />
      <pointLight position={[-5, 2.5, -2]} intensity={18} distance={14} color="#8b5cf6" />
      <pointLight position={[5, 1.5, -3]} intensity={6} distance={14} color="#22d3ee" />
      {BAKING ? <LiveEnvironment /> : <BakedEnvironment />}
    </>
  );
}

/**
 * The environment as a baked PNG in three's cube-UV layout (what PMREM would produce), used as the
 * env map directly. Building it at runtime (cube camera + PMREM) compiled PMREM's blur shader on the
 * main thread: a 0.6–1 s freeze in the boot on first visits (DECISIONS D-52).
 */
function BakedEnvironment() {
  const get = useThree((s) => s.get);
  const loaded = useLoader(TextureLoader, ENV_BAKE.url);
  const texture = useMemo(() => {
    const t = loaded.clone();
    t.mapping = CubeUVReflectionMapping;
    t.colorSpace = SRGBColorSpace;
    // Stored in readPixels row order, exactly like the render target PMREM writes.
    t.flipY = false;
    t.generateMipmaps = false;
    t.minFilter = LinearFilter;
    t.magFilter = LinearFilter;
    t.needsUpdate = true;
    return t;
  }, [loaded]);
  useEffect(() => {
    const { scene } = get();
    scene.environment = texture;
    scene.environmentIntensity = ENV_BAKE.scale;
    return () => {
      scene.environment = null;
      scene.environmentIntensity = 1;
      texture.dispose();
    };
  }, [get, texture]);
  return null;
}

/** Preload with the models (the boot counts it as one more layer). */
export const preloadEnvironment = () => {
  if (!BAKING) useLoader.preload(TextureLoader, ENV_BAKE.url);
};

/** The source of the bake: light panels rendered into a cube map, then PMREM'd. */
function LiveEnvironment() {
  return (
    <>
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.2} color="#d6d4ff" position={[0, 5, 2]} scale={[8, 2, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.8} color="#22d3ee" position={[6, 1, -2]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={0.8} color="#8b5cf6" position={[-6, 1, -2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
      </Environment>
      <BakeExport />
    </>
  );
}

/** Exposes the PMREM'd environment (half floats, readPixels order) as window.__envBake. */
function BakeExport() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const id = setInterval(() => {
      const env = scene.environment as CubeTexture | null;
      if (!env) return;
      clearInterval(id);
      const rt = new PMREMGenerator(gl).fromCubemap(env);
      const buf = new Uint16Array(rt.width * rt.height * 4);
      gl.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, buf);
      (window as unknown as { __envBake: unknown }).__envBake = { width: rt.width, height: rt.height, data: Array.from(buf) };
    }, 200);
    return () => clearInterval(id);
  }, [gl, scene]);
  return null;
}
