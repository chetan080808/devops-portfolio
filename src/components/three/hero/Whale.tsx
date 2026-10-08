"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Box3, Euler, Quaternion, MathUtils, MeshStandardMaterial, Vector3, type Group, type Mesh, type PerspectiveCamera, type PointLight } from "three";
import { site } from "@/content/site";
import { DRACO_PATH, MODELS } from "../assets";
import { clamp01, power2InOut, span, useIntroClock } from "../intro";
import { cloneWithMaterials, disposeMaterials } from "../materials";
import {
  BANK_GAIN,
  DOORS,
  MAX_BANK,
  MAX_PITCH,
  WHALE_GROW,
  WHALE_PATH,
  WHALE_SCALE,
  WHALE_SETTLED_AT,
  WHALE_START_SCALE,
  WHALE_SWIM,
} from "./choreography";
import { MINI_SCALE, attachMinis, miniRegistry } from "./minis";
import { whaleTrack } from "./tracking";
import { WhaleController } from "./whaleController";
import { scrollStory } from "@/lib/scrollStory";

const HIDE_COLOR = "#1c1f33";
const MINI_KEY_LIGHT = 4;
/** Height the minis add above the whale's back (whale-local units) */
const MINI_TOP = 0.22;
const PATH_LENGTH = WHALE_PATH.getLength();
const tangent = new Vector3();
const pathPos = new Vector3();
const camFwd = new Vector3();
const lineOfSight = new Vector3();
const offAxis = new Quaternion();
const identity = new Quaternion();
const ahead = new Vector3();
const euler = new Euler(0, 0, 0, "YXZ");

/** Heading (yaw about +Y) of a direction, for a model that faces +Z. */
const yawOf = (d: Vector3) => Math.atan2(d.x, d.z);


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
  // Bounds in whale space for on-screen limits: the body's box (the clone is still untransformed
  // and the minis, attached next, start at scale 0) plus the height the minis add on its back.
  const localBounds = useMemo(() => {
    const b = new Box3().setFromObject(whale);
    b.max.y += MINI_TOP;
    return b;
  }, [whale]);
  const minis = useMemo(() => attachMinis(whale, containerScene, site.projects.length), [whale, containerScene]);
  useEffect(() => {
    miniRegistry.attached = minis.map((m) => m.object);
    return () => void (miniRegistry.attached = []);
  }, [minis]);
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
  const keyLight = useRef<PointLight>(null);
  const controller = useRef<WhaleController | null>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = clock.time();
    g.visible = t >= DOORS.start;
    if (!g.visible) return;

    // Progress along the path, then position + orientation from the curve.
    const u = power2InOut(span(t, WHALE_SWIM.start, WHALE_SWIM.duration));
    // Once the controller owns the whale, the path must not touch its position: the controller
    // measures the whale's on-screen box from its current pose at the start of the frame.
    WHALE_PATH.getPointAt(u, pathPos);
    if (!controller.current?.active) g.position.copy(pathPos);
    whaleTrack.copy(g.position);
    WHALE_PATH.getTangentAt(u, tangent);
    WHALE_PATH.getTangentAt(Math.min(1, u + 0.02), ahead);

    // Level out over the last stretch so it settles into a calm hover.
    const settle = 1 - MathUtils.smoothstep(u, 0.82, 1);
    const yaw = yawOf(tangent);
    const turn = MathUtils.euclideanModulo(yawOf(ahead) - yaw + Math.PI, Math.PI * 2) - Math.PI;
    const turnPerUnit = turn / (0.02 * PATH_LENGTH);
    let pitch = MathUtils.clamp(Math.asin(tangent.y) * 0.8, -MAX_PITCH, MAX_PITCH) * settle;
    let bank = MathUtils.clamp(-turnPerUnit * BANK_GAIN, -MAX_BANK, MAX_BANK) * settle;
    let heading = yaw;
    let swimRate = 1;

    // After the intro: the swim controller (cursor follow / idle figure-eight) takes over from
    // the exact settled pose, so nothing jumps. Reduced motion: placed at home, held still.
    if (t >= WHALE_SETTLED_AT) {
      controller.current ??= new WhaleController(localBounds);
      const c = controller.current;
      if (!c.active) c.start(g.position, heading);
      const pose = c.update(delta, g, state.scene, state.camera as PerspectiveCamera, state.size.width, state.size.height, clock.still);
      g.position.copy(pose.position);
      whaleTrack.copy(g.position);
      heading = pose.yaw;
      pitch = pose.pitch;
      bank = pose.bank;
      swimRate = pose.swimRate;
    }
    swim.update(clock.still ? 0 : delta * swimRate);
    euler.set(-pitch, heading, bank);
    g.quaternion.setFromEuler(euler);
    // 4a: once the hero scrolls away, the lens-shifted hero camera sees the whale far off its
    // optical axis (steeply from above) — turn the whale with the line of sight so it reads as if
    // seen straight on, like at the hero.
    const ap = scrollStory.approach;
    if (ap > 0 && controller.current?.active) {
      const cam = state.camera;
      camFwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
      lineOfSight.subVectors(g.position, cam.position).normalize();
      offAxis.setFromUnitVectors(camFwd, lineOfSight);
      g.quaternion.premultiply(identity.clone().slerp(offAxis, ap * ap * (3 - 2 * ap)));
    }

    const grow = power2InOut(clamp01((u - WHALE_GROW.from) / (WHALE_GROW.to - WHALE_GROW.from)));
    g.scale.setScalar(MathUtils.lerp(WHALE_START_SCALE, WHALE_SCALE, grow) * (controller.current?.fit ?? 1));
    if (controller.current?.active) {
      controller.current.constrain(g, state.camera as PerspectiveCamera, state.size.width, state.size.height);
      whaleTrack.copy(g.position);
    }
    if (keyLight.current) keyLight.current.intensity = MINI_KEY_LIGHT * grow * grow;

    // Minis pop on, front to back, as the whale settles.
    // Minis ride from the start (children of the whale, so they scale with it while it's small).
    minis.forEach(({ object }) => object.scale.setScalar(MINI_SCALE));
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={whale} />
      {/* Key light front-above the cargo deck (whale-local units): rakes across the minis'
          corrugated sides and doors. Off while the whale is small/inside the container. */}
      <pointLight ref={keyLight} position={[0.55, 0.95, 0.75]} intensity={0} distance={3} decay={2} color="#e6ecff" />
    </group>
  );
}
