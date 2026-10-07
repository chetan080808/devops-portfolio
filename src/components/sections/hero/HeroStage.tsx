"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { CanvasErrorBoundary } from "@/components/three/CanvasErrorBoundary";
import { NODE_COUNT } from "@/components/three/cluster/layout";
import { heroLayout, measureHeroLayout } from "@/components/three/heroLayout";
import { useIsMobile, useMediaQuery, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { useSceneState } from "@/hooks/useSceneState";
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

/**
 * Desktop: the canvas spans the whole hero (so the whale can swim into the gap next to the
 * text), but nothing renders behind the text: fully transparent up to the text's right edge,
 * fading in over the 32 px clearance the whale keeps from it.
 */
function fullBleedMask(textRight: number) {
  const a = Math.max(0, Math.round(textRight));
  return (
    `linear-gradient(to right, transparent ${a}px, black ${a + 32}px, black 96%, transparent), ` +
    "linear-gradient(to bottom, transparent, black 7%, black 92%, transparent)"
  );
}

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
  const [mask, setMask] = useState(EDGE_FADE);

  // Stop the render loop entirely while the hero is off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Page geometry for the scene (stage framing, text clearance, navbar headroom).
  useEffect(() => {
    const stage = ref.current;
    const box = canvasBox.current;
    if (!stage || !box) return;
    const text = stage.closest("section")?.querySelector<HTMLElement>("[data-hero-text]") ?? null;
    const measure = () => {
      measureHeroLayout(box, stage, text, desktop);
      setMask(desktop ? fullBleedMask(heroLayout.text.x1) : EDGE_FADE);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(stage);
    if (text) ro.observe(text);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [desktop]);

  const nodes = mobile ? NODE_COUNT.mobile : NODE_COUNT.desktop;

  return (
    // Desktop: spans the whole right column, top-aligned (centring against the taller text
    // column pushed the cluster below the fold on short screens). `lg:static` lets the canvas
    // below position itself against the whole hero section.
    <div
      ref={ref}
      className="relative mx-auto aspect-square w-full max-w-[34rem] lg:static lg:aspect-auto lg:h-[clamp(21rem,calc(100svh-7.5rem),38rem)] lg:max-w-none lg:self-start"
    >
      <div className="relative h-full w-full">
        <div className={cn("absolute inset-0 transition-opacity duration-700", ready && "opacity-0")}>{fallback}</div>
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

      <div ref={canvasBox} className="pointer-events-none absolute inset-0 -z-0" style={maskStyle(mask)}>
        <CanvasErrorBoundary>
          <HeroCanvas mobile={mobile} reducedMotion={reducedMotion} active={inView} />
        </CanvasErrorBoundary>
      </div>
    </div>
  );
}
