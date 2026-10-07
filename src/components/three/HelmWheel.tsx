"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Vector3, type Group } from "three";
import { DRACO_PATH, MODELS } from "./assets";
import { power2InOut, power3Out, span, useIntroClock } from "./intro";
import { NODE_SCALE } from "./cluster/layout";
import { cloneWithMaterials, disposeMaterials } from "./materials";

/**
 * Native helm_wheel.glb: 1.07 across incl. handles, lies in XY, hub at origin, spins about Z.
 * Stands on the centre node's socket like the Blender scale render: the lowest handle tip
 * (0.533 below the hub) rests on the socket top (y 0.29 native). 1.5× the node scale so the
 * spokes still read at hero camera distance.
 */
const SCALE = NODE_SCALE * 1.5;
const FINAL = new Vector3(0, NODE_SCALE * 0.29 + 0.533 * SCALE, 0);
const FROM = new Vector3(0.6, 5.5, -9);
const START = 0.55;
const DURATION = 1.7;
/** Extra turns it unwinds while flying in, then the slow idle spin takes over. */
const ENTRY_TURNS = 2.25;
const IDLE_SPEED = 0.12; // rad/s
/** Turned three-quarters to the camera, like the Blender render. */
const YAW = -0.35;

/** The ship's wheel spins in from deep behind the cluster and lands on the centre node's socket. */
export function HelmWheel() {
  const clock = useIntroClock();
  const { scene } = useGLTF(MODELS.helm, DRACO_PATH);
  const wheel = useMemo(() => cloneWithMaterials(scene), [scene]);
  useEffect(() => () => disposeMaterials(wheel), [wheel]);
  const ref = useRef<Group>(null);
  const spin = useRef<Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g || !spin.current) return;
    const t = clock.time(state.clock.elapsedTime);
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
