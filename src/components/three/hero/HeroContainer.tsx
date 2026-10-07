"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  AnimationMixer,
  CanvasTexture,
  type Group,
  type MeshBasicMaterial,
  type PointLight,
} from "three";
import { DRACO_PATH, MODELS } from "../assets";
import { expoOut, power2InOut, span, useIntroClock } from "../intro";
import { cloneWithMaterials, disposeMaterials, neonMaterialsUnder } from "../materials";
import {
  CONTAINER_DROP,
  CONTAINER_IDLE,
  CONTAINER_NEON_BOOST,
  CONTAINER_LANDS_AT,
  CONTAINER_POS,
  CONTAINER_SCALE,
  CONTAINER_YAW,
  DOORS,
  INTERIOR_LIGHT,
  SPILL,
} from "./choreography";

/** Soft radial falloff for the floor spill, generated once (no texture download). */
let spillTexture: CanvasTexture | null = null;
function getSpillTexture() {
  if (spillTexture) return spillTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  spillTexture = new CanvasTexture(canvas);
  return spillTexture;
}

/**
 * The hero shipping container: drops onto its node, flashes its edges on landing, then the
 * doors swing open and a cyan light inside spills out across the deck.
 */
export function HeroContainer() {
  const clock = useIntroClock();
  const { scene, animations } = useGLTF(MODELS.container, DRACO_PATH);
  const container = useMemo(() => cloneWithMaterials(scene, CONTAINER_NEON_BOOST), [scene]);
  useEffect(() => () => disposeMaterials(container), [container]);

  const edges = useMemo(() => neonMaterialsUnder(container, "Container_EdgeGlow"), [container]);
  const edgeBase = useMemo(() => edges.map((m) => m.emissiveIntensity), [edges]);

  // Doors are scrubbed from the intro clock (not played), so reduced motion = fully open.
  // No LoopOnce/clampWhenFinished: a clamped action pauses itself at the end, and setTime()
  // then rewinds it to 0 for good. We clamp just short of the end instead.
  const doors = useMemo(() => {
    const clip = animations.find((a) => a.name === "DoorsOpen") ?? null;
    return { mixer: new AnimationMixer(container), clip, end: clip ? clip.duration - 1e-3 : 0 };
  }, [container, animations]);
  // Start in the effect that also stops it, so StrictMode's mount → unmount → mount restarts it.
  useEffect(() => {
    if (!doors.clip) return;
    const action = doors.mixer.clipAction(doors.clip).play();
    return () => void action.stop();
  }, [doors]);

  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const spill = useRef<MeshBasicMaterial>(null);
  const spillMap = useMemo(() => getSpillTexture(), []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = clock.time();
    g.visible = t >= CONTAINER_DROP.start;
    if (!g.visible) return;

    const drop = expoOut(span(t, CONTAINER_DROP.start, CONTAINER_DROP.duration));
    g.position.copy(CONTAINER_POS).setY(CONTAINER_POS.y + CONTAINER_DROP.height * (1 - drop));

    const since = t - CONTAINER_LANDS_AT;
    const flash = since > 0 ? 1.6 * Math.exp(-since * 4) : 0;
    edges.forEach((m, i) => (m.emissiveIntensity = edgeBase[i] * (1 + flash)));

    doors.mixer.setTime(Math.min(doors.end, Math.max(0, t - DOORS.start)));
    // Always mounted (intensity 0 until needed): toggling a light would recompile every shader.
    const glow =
      power2InOut(span(t, INTERIOR_LIGHT.start, INTERIOR_LIGHT.duration)) *
      (1 - (1 - CONTAINER_IDLE.level) * power2InOut(span(t, CONTAINER_IDLE.start, CONTAINER_IDLE.duration)));
    if (light.current) light.current.intensity = INTERIOR_LIGHT.intensity * glow;
    if (spill.current) spill.current.opacity = SPILL.opacity * glow;
  });

  return (
    <>
      <group ref={group} visible={false} rotation-y={CONTAINER_YAW} scale={CONTAINER_SCALE}>
        <primitive object={container} />
        {/* Inside, toward the back wall; local units are the container's native size. */}
        <pointLight ref={light} position={[0, 0.42, -0.35]} color="#22d3ee" intensity={0} distance={6} decay={2} />
      </group>
      {/* Light pool on the deck in front of the doors (additive, so it only ever brightens). */}
      <mesh position={SPILL.centre} rotation-x={-Math.PI / 2} scale={SPILL.radius * 2}>
        <planeGeometry />
        <meshBasicMaterial
          ref={spill}
          map={spillMap}
          color="#22d3ee"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
