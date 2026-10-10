"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh, type Material, type MeshStandardMaterial } from "three";
import { chaos } from "@/lib/chaos";
import { sceneStore } from "@/lib/sceneStore";
import { MODELS, useModel } from "../assets";
import { expoOut, span, useIntroClock } from "../intro";
import { cloneWithMaterials, disposeMaterials, isNeon, neonMaterialsUnder } from "../materials";
import { HEALTHY, chaosLook, type ChaosLook } from "./chaosLook";
import { ClusterLinks } from "./ClusterLinks";
import { NODE_COUNT, NODE_SCALE, buildCluster } from "./layout";

interface Props {
  mobile: boolean;
}

/** Chaos Monkey red (--color-danger) */
const CRASH_RED = new Color("#ef4444");
/** How far a crashed node sinks / tilts */
const SINK_Y = 0.12;
const SINK_TILT = 0.14;

interface NeonSlot {
  m: MeshStandardMaterial;
  color: Color;
  intensity: number;
  core: boolean;
}

/** Hex nodes fly in from above, land with a core flash, then the links wire them together. */
export function Cluster({ mobile }: Props) {
  const clock = useIntroClock();
  const { scene } = useModel(MODELS.node);
  const layout = useMemo(() => buildCluster(mobile ? NODE_COUNT.mobile : NODE_COUNT.desktop), [mobile]);

  // One clone per node, each with its own materials (Chaos Monkey recolors nodes individually).
  const instances = useMemo(
    () =>
      layout.nodes.map(() => {
        const object = cloneWithMaterials(scene);
        const core = new Set(neonMaterialsUnder(object, "ClusterNode_Core"));
        const neon = new Map<Material, NeonSlot>();
        object.traverse((o) => {
          if (!(o instanceof Mesh)) return;
          const mats: Material[] = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (!isNeon(m) || neon.has(m)) continue;
            neon.set(m, { m, color: m.emissive.clone(), intensity: m.emissiveIntensity, core: core.has(m) });
          }
        });
        return { object, neon: [...neon.values()] };
      }),
    [scene, layout],
  );
  useEffect(() => () => instances.forEach(({ object }) => disposeMaterials(object)), [instances]);

  const reported = useRef(false);

  useFrame(() => {
    const t = clock.time();
    const run = chaos.get();
    const ct = chaos.elapsed();

    layout.nodes.forEach((node, i) => {
      const { object, neon } = instances[i];
      object.visible = t >= node.delay;
      if (!object.visible) return;

      const p = expoOut(span(t, node.delay, node.duration));
      object.position.lerpVectors(node.from, node.position, p);
      object.rotation.set(node.fromTilt * (1 - p), node.fromSpin * (1 - p), 0);
      object.scale.setScalar(NODE_SCALE * (0.35 + 0.65 * p));

      // Landing flash on the core, decaying back to its authored glow.
      const since = t - node.landsAt;
      const flash = since > 0 ? 2.2 * Math.exp(-since * 3.5) : 0;

      // Chaos Monkey: victims flicker red, sink, then heal back with a flash.
      const victim = run ? run.victims.indexOf(i) : -1;
      const look: ChaosLook = victim >= 0 ? chaosLook(victim, i, ct, clock.still) : HEALTHY;
      if (look.sink > 0) {
        object.position.y -= SINK_Y * look.sink;
        object.rotation.x += SINK_TILT * look.sink * (i % 2 ? 1 : -1);
        object.rotation.z += SINK_TILT * 0.6 * look.sink;
      }
      for (const s of neon) {
        s.m.emissive.copy(s.color).lerp(CRASH_RED, look.red);
        s.m.emissiveIntensity = s.intensity * look.glow * (s.core ? 1 + flash + look.flash : 1);
      }
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
