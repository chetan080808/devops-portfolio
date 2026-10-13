"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ChaosMonkeyButton } from "@/components/easter-eggs/ChaosMonkey";
import { CanvasErrorBoundary } from "@/components/three/CanvasErrorBoundary";
import { NODE_COUNT } from "@/components/three/cluster/axial";
import { measureHeroLayout } from "@/components/three/heroLayout";
import { useIsMobile, useMediaQuery, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { useChaosRun, useChaosTime } from "@/hooks/useChaos";
import { useSceneState } from "@/hooks/useSceneState";
import { site } from "@/content/site";
import { chaos, nodesDown } from "@/lib/chaos";
import { sceneStore } from "@/lib/sceneStore";
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
 * Phones (narrow + touch) first get a still of the scene. Same condition as the
 * `max-md:pointer-coarse:` classes below, so the server HTML already shows the right thing. Capable
 * phones then load the 3D on their own once the page is idle (it fades in over the still);
 * low-end phones and Save-Data keep the still, with a "load 3D anyway" button.
 */
const PHONE_QUERY = "(max-width: 767px) and (pointer: coarse)";
const subscribePhone = (onChange: () => void) => {
  const mql = window.matchMedia(PHONE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
/** null during SSR + hydration: nothing mounts the canvas (and fetches the 3D chunk) until known. */
const usePhone = () => useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => null);

/** Enough memory and cores for the scene, and no data-saving / 2G connection. */
function canAutoLoad3d() {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  if (n.connection?.saveData) return false;
  if (/(^|-)2g$/.test(n.connection?.effectiveType ?? "")) return false;
  // deviceMemory is Chromium-only (undefined on iOS): judge by cores there.
  if (n.deviceMemory !== undefined && n.deviceMemory < 4) return false;
  if (n.hardwareConcurrency !== undefined && n.hardwareConcurrency < 4) return false;
  return true;
}

const noSubscribe = () => () => {};
/** null during SSR + hydration; then fixed for the page's life. */
const useAutoCapable = () => useSyncExternalStore(noSubscribe, canAutoLoad3d, () => null);

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
  // 3D failed or software-only WebGL (see HeroCanvas): unmount the canvas, keep the static hero.
  const failed = useSceneState((s) => s.failed);
  const phone = usePhone();
  const [want3d, setWant3d] = useState(false);
  // null until known (client only): capable phones load the 3D themselves, no button.
  const autoCapable = useAutoCapable();
  const staticHero = phone === true && !want3d;
  const show3d = (phone === false || want3d) && !failed;
  useEffect(() => {
    if (phone !== true || autoCapable !== true) return;
    // After the page has loaded and gone idle: the text is already up, the 3D fades in later.
    let idle = 0;
    let timer = 0;
    const go = () => setWant3d(true);
    // Safari has no requestIdleCallback (the DOM types assume it always exists).
    const ric = window.requestIdleCallback as Window["requestIdleCallback"] | undefined;
    const schedule = () => {
      if (ric) idle = ric(go, { timeout: 2500 });
      else timer = window.setTimeout(go, 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      if (idle) window.cancelIdleCallback?.(idle);
      window.clearTimeout(timer);
    };
  }, [phone, autoCapable]);
  useEffect(() => {
    if (phone !== null) sceneStore.set({ deferred: staticHero, deferredAuto: autoCapable === true });
  }, [phone, staticHero, autoCapable]);

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
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[34rem] lg:aspect-auto lg:h-[clamp(21rem,calc(100svh-7.5rem),38rem)] lg:max-w-none lg:self-start",
        // Below lg the stage sits between the name and the pitch (Hero.tsx); on phones it runs
        // edge to edge (past the page padding) so the scene gets the whole width.
        "max-lg:order-2 max-md:-mx-4 max-md:w-[calc(100%+2rem)] max-md:max-w-none",
      )}
    >
      <div className="relative h-full w-full">
        <div className={cn("absolute inset-0 transition-opacity duration-700", ready && "opacity-0")}>
          <div className="h-full w-full max-md:pointer-coarse:hidden">{fallback}</div>
          {/* A still of the live scene (captured from the mobile canvas): phones, until 3D is asked for */}
          <Image
            src={site.hero.staticImage.src}
            alt={site.hero.staticImage.alt}
            width={816}
            height={816}
            sizes="(max-width: 767px) 92vw, 34rem"
            className="hidden h-full w-full object-contain max-md:pointer-coarse:block"
            style={maskStyle(EDGE_FADE)}
          />
        </div>
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
              : want3d && !ready && !failed
                ? "pulling 3D layers…"
                : !ready || clusterReady
                ? `[ OK ] ${nodes}/${nodes} nodes ready`
                : "scheduling nodes…"}
          </p>
          {staticHero && autoCapable === false ? (
            <button
              type="button"
              onClick={() => setWant3d(true)}
              aria-describedby="load-3d-hint"
              className="rounded-md border border-line-strong px-2 py-0.5 font-mono text-[0.68rem] whitespace-nowrap text-muted transition-[color,border-color,transform] duration-300 hover:border-cyan/50 hover:text-cyan focus-visible:border-cyan focus-visible:text-cyan active:scale-95"
            >
              load 3D anyway
              <span id="load-3d-hint" className="sr-only">
                Loads the interactive 3D scene: about 1 MB more and heavier on battery.
              </span>
            </button>
          ) : (
            // Waits for the intro to finish wiring the cluster (if the 3D scene is up at all).
            <ChaosMonkeyButton disabled={ready && !clusterReady} />
          )}
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
        {show3d && (
          <CanvasErrorBoundary>
            <HeroCanvas mobile={mobile} reducedMotion={reducedMotion} drop={desktop && !reducedMotion} active={inView} />
          </CanvasErrorBoundary>
        )}
      </div>
    </div>
  );
}
