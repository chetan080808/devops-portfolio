"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Vector3, type Group } from "three";
import { DRACO_PATH, MODELS } from "./assets";
import { power2InOut, power3Out, span, useIntroClock } from "./intro";
import { NODE_SCALE } from "./cluster/layout";
import { cloneWithMaterials, disposeMaterials, tunePart } from "./materials";


/**
 * Native helm_wheel.glb: 1.07 across incl. handles, lies in XY, hub at origin, spins about Z.
 * Stands upright on the centre node's socket like the Blender front scale render: the lowest
 * handle tip (0.533 below the hub) rests on the socket top (y 0.29 native). ~1.7× node width
 * (2.0 vs 1.2) so it's the cluster's focal point, rising well above the honeycomb.
 */
const SCALE = 1.9;
const FINAL = new Vector3(0, NODE_SCALE * 0.29 + 0.533 * SCALE, 0);
const FROM = new Vector3(0.6, 5.5, -9);
const START = 0.55;
const DURATION = 1.7;
/** Extra turns it unwinds while flying in, then the slow idle spin takes over. */
const ENTRY_TURNS = 2.25;
const IDLE_SPEED = 0.12; // rad/s
/** Nearly face-on so the full circle, all 8 spokes and the handles read. */
const YAW = -0.12;
/** Rim below the bloom threshold so rim, spokes and hub stay distinct (no glowing blob)… */
const RIM_LEVEL = 0.72;
/** …and the violet handle tips brighter and lighter, as in the render. */
const TIP_LEVEL = 1.25;
const TIP_COLOR = "#9d6bff";

/** The ship's wheel spins in from deep behind the cluster and lands on the centre node's socket. */
export function HelmWheel() {
  const clock = useIntroClock();
  const { scene } = useGLTF(MODELS.helm, DRACO_PATH);
  const wheel = useMemo(() => {
    const clone = cloneWithMaterials(scene);
    // Rim and hub cap share one cyan material in the GLB: give the parts their own copies first.
    tunePart(clone, "HelmWheel_Rim", (m) => (m.emissiveIntensity *= RIM_LEVEL));
    tunePart(clone, "HelmWheel_Tips", (m) => {
      m.emissiveIntensity *= TIP_LEVEL;
      m.emissive.set(TIP_COLOR);
    });
    return clone;
  }, [scene]);
  useEffect(() => () => disposeMaterials(wheel), [wheel]);
  const ref = useRef<Group>(null);
  const spin = useRef<Group>(null);

  useFrame(() => {
    const g = ref.current;
    if (!g || !spin.current) return;
    const t = clock.time();
    g.visible = t >= START;
    if (!g.visible) return;

    const move = power2InOut(span(t, START, DURATION * 0.85));
    const settle = power3Out(span(t, START, DURATION));
    g.position.lerpVectors(FROM, FINAL, move);
    g.scale.setScalar(SCALE * (0.2 + 0.8 * settle));
    // Fast spin that unwinds into the idle rotation (continuous: no jump when it settles).
    const unwind = ENTRY_TURNS * Math.PI * 2 * settle;
    spin.current.rotation.z = -(unwind + IDLE_SPEED * Math.max(0, t - START));
  });

  return (
    <group ref={ref} visible={false} rotation-y={YAW}>
      <group ref={spin}>
        <primitive object={wheel} />
      </group>
    </group>
  );
}
