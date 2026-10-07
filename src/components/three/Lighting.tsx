"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Dark studio: a cool key, cyan/violet rims, and an in-scene environment built from
 * light panels (no HDRI download) so the dark metal has something to reflect.
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
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.2} color="#d6d4ff" position={[0, 5, 2]} scale={[8, 2, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.8} color="#22d3ee" position={[6, 1, -2]} scale={[2, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={0.8} color="#8b5cf6" position={[-6, 1, -2]} scale={[2, 6, 1]} rotation-y={Math.PI / 2} />
      </Environment>
    </>
  );
}
