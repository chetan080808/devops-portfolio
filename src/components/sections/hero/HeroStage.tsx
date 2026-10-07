"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { CanvasErrorBoundary } from "@/components/three/CanvasErrorBoundary";
import { NODE_COUNT } from "@/components/three/cluster/layout";
import { useIsMobile, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { useSceneState } from "@/hooks/useSceneState";
import { cn } from "@/lib/cn";

// three + R3F + scene code live in their own chunk, fetched on the client only.
const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), { ssr: false });

/**
 * Hosts the lazy 3D canvas. `fallback` (the static SVG cluster) is server-rendered, shows
 * while the scene loads, and stays as the no-WebGL fallback.
 */
export function HeroStage({ fallback }: { fallback: ReactNode }) {
  const mobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const ready = useSceneState((s) => s.sceneReady && !s.failed);
  const clusterReady = useSceneState((s) => s.clusterReady);
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

  const nodes = mobile ? NODE_COUNT.mobile : NODE_COUNT.desktop;

  return (
    // Desktop: also capped by viewport height so the whole cluster sits above the fold on short screens
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[34rem] lg:max-w-[min(34rem,calc(100svh-9rem))]">
      <div className={cn("absolute inset-0 transition-opacity duration-700", ready && "opacity-0")}>{fallback}</div>

      {/* Larger than the column on desktop so glow and motion never hit a hard edge */}
      <div
        className="pointer-events-none absolute inset-0 lg:-inset-x-[22%] lg:-inset-y-[14%]"
        style={{ maskImage: "radial-gradient(closest-side, black 86%, transparent)" }}
      >
        <CanvasErrorBoundary>
          <HeroCanvas mobile={mobile} reducedMotion={reducedMotion} active={inView} />
        </CanvasErrorBoundary>
      </div>

      <p
        className={cn(
          "absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[0.68rem] whitespace-nowrap transition-colors",
          clusterReady || !ready ? "text-faint" : "text-cyan",
        )}
        aria-live="polite"
      >
        {!ready || clusterReady ? `[ OK ] ${nodes}/${nodes} nodes ready` : "scheduling nodes…"}
      </p>
    </div>
  );
}
