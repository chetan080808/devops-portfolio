"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Object3D, Quaternion, Vector3, type InstancedMesh } from "three";
import { power3Out, span, useIntroClock } from "../intro";
import type { LinkSpec } from "./layout";

/** Same level as the node rims (see NEON_LEVEL); the spark is a brief HDR highlight. */
const LINK_COLOR = new Color("#22d3ee").multiplyScalar(1.1);
const SPARK_COLOR = new Color("#e0fbff").multiplyScalar(3);
const THICKNESS = 0.026;
const SPARK_SIZE = 0.075;

const X_AXIS = new Vector3(1, 0, 0);
const dummy = new Object3D();
const dir = new Vector3();
const head = new Vector3();
const rot = new Quaternion();

/**
 * All links in one instanced draw call. Each beam grows from node A to node B once both have
 * landed, with a bright spark riding the drawing tip.
 */
export function ClusterLinks({ links }: { links: LinkSpec[] }) {
  const clock = useIntroClock();
  const beams = useRef<InstancedMesh>(null);
  const sparks = useRef<InstancedMesh>(null);
  const settled = useRef(false);

  const geometry = useMemo(
    () => links.map((l) => ({ length: l.start.distanceTo(l.end), quat: rotationTo(l.start, l.end) })),
    [links],
  );

  // Start fully hidden (zero scale) until the intro reaches each link.
  useLayoutEffect(() => {
    settled.current = false;
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    links.forEach((_, i) => {
      beams.current?.setMatrixAt(i, dummy.matrix);
      sparks.current?.setMatrixAt(i, dummy.matrix);
    });
  }, [links]);

  useFrame(() => {
    if (settled.current || !beams.current || !sparks.current) return;
    const t = clock.time();
    let allDone = true;

    links.forEach((link, i) => {
      const raw = span(t, link.delay, link.duration);
      const p = power3Out(raw);
      if (raw < 1) allDone = false;
      const { length, quat } = geometry[i];

      // Beam: a unit box stretched from start to the current head, centred on that segment.
      head.lerpVectors(link.start, link.end, p);
      dummy.position.lerpVectors(link.start, head, 0.5);
      dummy.quaternion.copy(quat);
      dummy.scale.set(Math.max(length * p, 1e-4), p > 0 ? THICKNESS : 0, p > 0 ? THICKNESS : 0);
      dummy.updateMatrix();
      beams.current!.setMatrixAt(i, dummy.matrix);

      // Spark: visible only while drawing, swelling then shrinking.
      const s = raw > 0 && raw < 1 ? SPARK_SIZE * Math.sin(Math.PI * raw) : 0;
      dummy.position.copy(head);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      sparks.current!.setMatrixAt(i, dummy.matrix);
    });

    beams.current.instanceMatrix.needsUpdate = true;
    sparks.current.instanceMatrix.needsUpdate = true;
    // Matrices are static once every link is drawn — stop touching them.
    if (allDone) settled.current = true;
  });

  return (
    <group>
      <instancedMesh ref={beams} args={[undefined, undefined, links.length]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color={LINK_COLOR} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={sparks} args={[undefined, undefined, links.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={SPARK_COLOR} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function rotationTo(from: Vector3, to: Vector3) {
  dir.subVectors(to, from).normalize();
  return rot.setFromUnitVectors(X_AXIS, dir).clone();
}
