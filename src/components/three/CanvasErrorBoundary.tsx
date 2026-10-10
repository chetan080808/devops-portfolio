"use client";

import { Component, type ReactNode } from "react";
import { sceneStore } from "@/lib/sceneStore";

/** Catches WebGL context / chunk / model failures: the hero keeps its static fallback. */
export class CanvasErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[scene] 3D disabled:", error);
    sceneStore.set({ failed: true, failReason: "error" });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
