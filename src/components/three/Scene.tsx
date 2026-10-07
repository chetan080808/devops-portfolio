"use client";

import { useGLTF } from "@react-three/drei";
import { DRACO_PATH, MODELS } from "./assets";

interface Props {
  mobile: boolean;
}

/** Hero scene. Phase 3a: only resolves the models (suspends until loaded) — visuals land in 3b–3d. */
export function Scene({ mobile }: Props) {
  // One call per URL: an array call is cached under its own key and would re-download everything.
  useGLTF(MODELS.container, DRACO_PATH);
  useGLTF(MODELS.whale, DRACO_PATH);
  useGLTF(MODELS.node, DRACO_PATH);
  useGLTF(MODELS.helm, DRACO_PATH);
  void mobile;
  return null;
}
