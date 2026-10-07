"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { sceneStore } from "@/lib/sceneStore";
import { DRACO_PATH, MODELS } from "../assets";
import { expoOut, span, useIntroClock } from "../intro";
import { cloneWithMaterials, disposeMaterials, neonMaterialsUnder } from "../materials";
import { ClusterLinks } from "./ClusterLinks";
import { NODE_COUNT, NODE_SCALE, buildCluster } from "./layout";

interface Props {
  mobile: boolean;
}

/** Hex nodes fly in from above, land with a core flash, then the links wire them together. */
export function Cluster({ mobile }: Props) {
  const clock = useIntroClock();
  const { scene } = useGLTF(MODELS.node, DRACO_PATH);
  const layout = useMemo(() => buildCluster(mobile ? NODE_COUNT.mobile : NODE_COUNT.desktop), [mobile]);

  // One clone per node, each with its own materials (Chaos Monkey recolors nodes individually).
  const instances = useMemo(
    () =>
      layout.nodes.map(() => {
        const object = cloneWithMaterials(scene);
        const core = neonMaterialsUnder(object, "ClusterNode_Core");
        return { object, core, coreBase: core.map((m) => m.emissiveIntensity) };
      }),
    [scene, layout],
  );
  useEffect(() => () => instances.forEach(({ object }) => disposeMaterials(object)), [instances]);

  const reported = useRef(false);

  useFrame(() => {
    const t = clock.time();
    layout.nodes.forEach((node, i) => {
      const { object, core, coreBase } = instances[i];
      object.visible = t >= node.delay;
      if (!object.visible) return;

      const p = expoOut(span(t, node.delay, node.duration));
      object.position.lerpVectors(node.from, node.position, p);
      object.rotation.set(node.fromTilt * (1 - p), node.fromSpin * (1 - p), 0);
      object.scale.setScalar(NODE_SCALE * (0.35 + 0.65 * p));

      // Landing flash on the core, decaying back to its authored glow.
      const since = t - node.landsAt;
      const flash = since > 0 ? 2.2 * Math.exp(-since * 3.5) : 0;
      core.forEach((m, k) => (m.emissiveIntensity = coreBase[k] * (1 + flash)));
    });

    if (!reported.current && t > layout.settledAt) {
      reported.current = true;
      sceneStore.set({ clusterReady: true });
    }
  });

  return (
    <group>
      {instances.map(({ object }, i) => (
        <primitive key={i} object={object} visible={false} />
      ))}
      <ClusterLinks links={layout.links} />
    </group>
  );
}
