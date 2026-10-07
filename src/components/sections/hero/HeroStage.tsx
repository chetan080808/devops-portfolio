"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { CanvasErrorBoundary } from "@/components/three/CanvasErrorBoundary";
import { useIsMobile } from "@/hooks/useMediaQuery";

// three + R3F + scene code live in their own chunk, fetched on the client only.
const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), { ssr: false });

/**
 * Hosts the lazy 3D canvas. `fallback` (the static SVG cluster) renders on the server
 * and stays as the no-WebGL fallback.
 */
export function HeroStage({ fallback }: { fallback: ReactNode }) {
  const mobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  // Stop the render loop entirely while the hero is off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[34rem]">
      {fallback}
      <div className="pointer-events-none absolute inset-0">
        <CanvasErrorBoundary>
          <HeroCanvas mobile={mobile} active={inView} />
        </CanvasErrorBoundary>
      </div>
    </div>
  );
}
