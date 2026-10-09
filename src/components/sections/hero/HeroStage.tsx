"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ChaosMonkeyButton } from "@/components/easter-eggs/ChaosMonkey";
import { CanvasErrorBoundary } from "@/components/three/CanvasErrorBoundary";
import { NODE_COUNT } from "@/components/three/cluster/layout";
import { measureHeroLayout } from "@/components/three/heroLayout";
import { useIsMobile, useMediaQuery, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { useChaosRun, useChaosTime } from "@/hooks/useChaos";
import { useSceneState } from "@/hooks/useSceneState";
import { chaos, nodesDown } from "@/lib/chaos";
import { cn } from "@/lib/cn";

/** Mobile / tablet: the canvas sits in the stage; soft fade on all four edges. */
const EDGE_FADE =
  "linear-gradient(to right, transparent, black 14%, black 86%, transparent), linear-gradient(to bottom, transparent, black 10%, black 88%, transparent)";

const maskStyle = (image: string): CSSProperties => ({
  maskImage: image,
  WebkitMaskImage: image,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
});

// three + R3F + scene code live in their own chunk, fetched on the client only.
const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), { ssr: false });

/**
 * Hosts the lazy 3D canvas. `fallback` (the static SVG cluster) is server-rendered, shows
 * while the scene loads, and stays as the no-WebGL fallback.
 */
export function HeroStage({ fallback }: { fallback: ReactNode }) {
  const mobile = useIsMobile();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reducedMotion = usePrefersReducedMotion();
  const ready = useSceneState((s) => s.sceneReady && !s.failed);
  const clusterReady = useSceneState((s) => s.clusterReady);
  const ref = useRef<HTMLDivElement>(null);
  const canvasBox = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  // Stop the render loop while neither the hero nor Deployments (where the minis land) is visible.
  useEffect(() => {
    const hero = ref.current?.closest("section");
    if (!hero) return;
    const targets = [hero, document.getElementById("deployments")].filter((el): el is HTMLElement => !!el);
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setInView(visible.size > 0);
      },
      { rootMargin: "100px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  // Page geometry for the scene (stage framing, text clearance, navbar headroom).
  useEffect(() => {
    const stage = ref.current;
    const box = canvasBox.current;
    if (!stage || !box) return;
    const text = stage.closest("section")?.querySelector<HTMLElement>("[data-hero-text]") ?? null;
    const measure = () => measureHeroLayout(box, stage, text, desktop);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(stage);
    if (text) ro.observe(text);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [desktop]);

  const nodes = mobile ? NODE_COUNT.mobile : NODE_COUNT.desktop;
  useEffect(() => chaos.setNodeCount(nodes), [nodes]);
  const run = useChaosRun();
  const chaosT = useChaosTime(run);
  const down = run && chaosT >= 0 ? nodesDown(run, chaosT) : 0;

  return (
    // Desktop: spans the whole right column, top-aligned (centring against the taller text
    // column pushed the cluster below the fold on short screens).
    <div
      ref={ref}
      className="relative mx-auto aspect-square w-full max-w-[34rem] lg:aspect-auto lg:h-[clamp(21rem,calc(100svh-7.5rem),38rem)] lg:max-w-none lg:self-start"
    >
      <div className="relative h-full w-full">
        <div className={cn("absolute inset-0 transition-opacity duration-700", ready && "opacity-0")}>{fallback}</div>
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-3">
          <p
            className={cn(
              "font-mono text-[0.68rem] whitespace-nowrap transition-colors",
              down > 0 ? "text-warning" : clusterReady || !ready ? "text-faint" : "text-cyan",
            )}
            // The Chaos Monkey log announces the run; don't also announce every count change here.
            aria-live={run ? "off" : "polite"}
          >
            {down > 0
              ? `[ WARN ] ${nodes - down}/${nodes} nodes ready`
              : !ready || clusterReady
                ? `[ OK ] ${nodes}/${nodes} nodes ready`
                : "scheduling nodes…"}
          </p>
          {/* Waits for the intro to finish wiring the cluster (if the 3D scene is up at all). */}
          <ChaosMonkeyButton disabled={ready && !clusterReady} />
        </div>
      </div>

      {/* Mobile: inside the stage with soft CSS edges. Desktop: fixed to the viewport, above the
          content (so the minis can land on the project cards) and below the navbar; the hero
          scene follows the scroll and is masked in WebGL (heroMaskPass). */}
      <div
        ref={canvasBox}
        // Hidden while the render loop is stopped: the fixed canvas would otherwise keep showing its
        // last frame (e.g. the whale) over whatever section a fast scroll or nav jump lands on.
        className={cn("pointer-events-none absolute inset-0 lg:fixed lg:z-30", !inView && "invisible")}
        style={desktop ? undefined : maskStyle(EDGE_FADE)}
      >
        <CanvasErrorBoundary>
          <HeroCanvas mobile={mobile} reducedMotion={reducedMotion} drop={desktop && !reducedMotion} active={inView} />
        </CanvasErrorBoundary>
      </div>
    </div>
  );
}
