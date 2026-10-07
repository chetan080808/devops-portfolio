"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Euler, MathUtils, MeshStandardMaterial, Vector3, type Group, type Mesh } from "three";
import { site } from "@/content/site";
import { DRACO_PATH, MODELS } from "../assets";
import { clamp01, power2InOut, span, useIntroClock } from "../intro";
import { cloneWithMaterials, disposeMaterials } from "../materials";
import {
  BANK_GAIN,
  DOORS,
  MAX_BANK,
  MAX_PITCH,
  MINIS_POP,
  WHALE_GROW,
  WHALE_PATH,
  WHALE_SCALE,
  WHALE_START_SCALE,
  WHALE_SWIM,
} from "./choreography";
import { MINI_SCALE, attachMinis } from "./minis";
import { whaleTrack } from "./tracking";

const HIDE_COLOR = "#1c1f33";
const PATH_LENGTH = WHALE_PATH.getLength();
const tangent = new Vector3();
const ahead = new Vector3();
const euler = new Euler(0, 0, 0, "YXZ");

/** Heading (yaw about +Y) of a direction, for a model that faces +Z. */
const yawOf = (d: Vector3) => Math.atan2(d.x, d.z);
/** Back-out easing for the minis' pop. */
const backOut = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

/**
 * The whale swims out of the container small, grows to full size along a banking path,
 * and settles in a three-quarter profile with one mini container per project on its back.
 */
export function Whale() {
  const clock = useIntroClock();
  const { scene, animations } = useGLTF(MODELS.whale, DRACO_PATH);
  const { scene: containerScene } = useGLTF(MODELS.container, DRACO_PATH);

  const whale = useMemo(() => {
    const clone = cloneWithMaterials(scene);
    // The authored hide (near-black metal) vanishes against the #05070d page; lift it to a deep
    // slate-violet so the body's silhouette reads. Only this clone's material changes.
    clone.traverse((o) => {
      const m = (o as Mesh).material;
      if (m instanceof MeshStandardMaterial && m.name === "PF_WhaleHide") m.color.set(HIDE_COLOR);
    });
    return clone;
  }, [scene]);
  const minis = useMemo(() => attachMinis(whale, containerScene, site.projects.length), [whale, containerScene]);
  // Also frees the minis' materials: they're parented under the whale.
  useEffect(() => () => disposeMaterials(whale), [whale]);

  const swim = useMemo(() => new AnimationMixer(whale), [whale]);
  // Started in the effect that stops it, so StrictMode's remount restarts the loop.
  useEffect(() => {
    const clip = animations.find((a) => a.name === "Swim");
    if (!clip) return;
    const action = swim.clipAction(clip).play();
    return () => void action.stop();
  }, [swim, animations]);

  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = clock.time();
    g.visible = t >= DOORS.start;
    if (!g.visible) return;
    swim.update(delta);

    // Progress along the path, then position + orientation from the curve.
    const u = power2InOut(span(t, WHALE_SWIM.start, WHALE_SWIM.duration));
    WHALE_PATH.getPointAt(u, g.position);
    whaleTrack.copy(g.position);
    WHALE_PATH.getTangentAt(u, tangent);
    WHALE_PATH.getTangentAt(Math.min(1, u + 0.02), ahead);

    // Level out over the last stretch so it settles into a calm hover.
    const settle = 1 - MathUtils.smoothstep(u, 0.82, 1);
    const yaw = yawOf(tangent);
    const turn = MathUtils.euclideanModulo(yawOf(ahead) - yaw + Math.PI, Math.PI * 2) - Math.PI;
    const turnPerUnit = turn / (0.02 * PATH_LENGTH);
    const pitch = MathUtils.clamp(Math.asin(tangent.y) * 0.8, -MAX_PITCH, MAX_PITCH) * settle;
    const bank = MathUtils.clamp(-turnPerUnit * BANK_GAIN, -MAX_BANK, MAX_BANK) * settle;
    euler.set(-pitch, yaw, bank);
    g.quaternion.setFromEuler(euler);

    const grow = power2InOut(clamp01((u - WHALE_GROW.from) / (WHALE_GROW.to - WHALE_GROW.from)));
    g.scale.setScalar(MathUtils.lerp(WHALE_START_SCALE, WHALE_SCALE, grow));

    // Minis pop on, front to back, as the whale settles.
    const popStart = WHALE_SWIM.start + MINIS_POP.at * WHALE_SWIM.duration;
    minis.forEach(({ object }, i) => {
      const p = span(t, popStart + i * MINIS_POP.stagger, MINIS_POP.duration);
      object.scale.setScalar(p > 0 ? MINI_SCALE * backOut(p) : 0);
    });
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={whale} />
    </group>
  );
}
