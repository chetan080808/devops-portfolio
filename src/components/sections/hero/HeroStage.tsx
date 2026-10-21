"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { getImageProps } from "next/image";
import { ChaosMonkeyButton } from "@/components/easter-eggs/ChaosMonkey";
import { CanvasErrorBoundary } from "@/components/three/CanvasErrorBoundary";
import { NODE_COUNT } from "@/components/three/cluster/axial";
import { measureHeroLayout } from "@/components/three/heroLayout";
import { FRAME_BLEED, STILL_FIT } from "@/components/three/cameraFit";
import { STILL_CAPTURE } from "@/lib/stillCapture";
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

/**
 * When capable phones start the 3D. Its start-up (code evaluation, WebGL context, environment map)
 * has synchronous steps, so it must not start mid-scroll: see DECISIONS (mobile 3D auto-load).
 */
const AUTO_3D = { delayMs: 5000, quietMs: 800, onInteraction: false };

const noSubscribe = () => () => {};
/** null during SSR + hydration; then fixed for the page's life. */
const useAutoCapable = () => useSyncExternalStore(noSubscribe, canAutoLoad3d, () => null);

/**
 * Did the boot screen run when the page hydrated? Read once and kept: the attribute moves on to
 * "leaving" / "done" later. If the gate's safety net already ended it, this is false.
 */
let bootRanAtStart: boolean | undefined;
const readBootRan = () => (bootRanAtStart ??= document.documentElement.dataset.boot === "run");
const useBootRan = () => useSyncExternalStore(noSubscribe, readBootRan, () => null);

// three + R3F + scene code live in their own chunk, fetched on the client only.
const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), { ssr: false });

/**
 * Hosts the lazy 3D canvas, and the still of the scene that stands in for it (HeroStill).
 */
export function HeroStage() {
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
  // Capable phone with the boot running: the 3D loads during the boot. Otherwise (boot skipped or
  // cut short) the still shows first and the 3D comes in later, settled.
  const bootRan = useBootRan();
  const loadInBoot = phone === true && autoCapable === true && bootRan === true;
  const want = want3d || loadInBoot;
  const staticHero = phone === true && !want;
  const show3d = (phone === false || want) && !failed;
  // Desktop, and phones loading the 3D in the boot: the boot waits for the whole warm-up (up to
  // WAIT_3D_CAP_MS, useBootTimeline) and ends straight into the intro.
  const bootWaits3d = bootRan === true && (phone === false || loadInBoot);
  useEffect(() => {
    if (phone !== true || autoCapable !== true || bootRan !== false) return;
    // Text and still are up at once; the 3D starts AUTO_3D.delayMs after load, at a quiet moment
    // (no touch / scroll for AUTO_3D.quietMs, so its start-up never lands mid-scroll), or on the
    // first interaction if AUTO_3D.onInteraction.
    let timer = 0;
    let idle = 0;
    let started = false;
    let lastInput = 0;
    const ric = window.requestIdleCallback as Window["requestIdleCallback"] | undefined; // none in Safari
    const start = () => {
      if (started) return;
      started = true;
      removeInput();
      if (ric) idle = ric(() => setWant3d(true), { timeout: 1000 });
      else setWant3d(true);
    };
    const onInput = () => {
      lastInput = performance.now();
      if (AUTO_3D.onInteraction) start();
    };
    const whenQuiet = () => {
      const since = performance.now() - lastInput;
      if (since < AUTO_3D.quietMs) timer = window.setTimeout(whenQuiet, AUTO_3D.quietMs - since);
      else start();
    };
    const afterLoad = () => (timer = window.setTimeout(whenQuiet, AUTO_3D.delayMs));
    const inputs = ["touchstart", "scroll", "wheel", "keydown"] as const;
    inputs.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
    const removeInput = () => inputs.forEach((e) => window.removeEventListener(e, onInput));
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      removeInput();
      window.removeEventListener("load", afterLoad);
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback?.(idle);
    };
  }, [phone, autoCapable, bootRan]);
  useEffect(() => {
    if (phone !== null) sceneStore.set({ deferred: staticHero, deferredAuto: autoCapable === true, bootWaits3d });
  }, [phone, staticHero, autoCapable, bootWaits3d]);
  // The still: a capture of the scene's first settled frame (scripts/capture-hero-still.mjs). It
  // shows while the 3D isn't there (boot skipped, the phone cap, low-end phones, a slow warm-up
  // after the boot) and as the no-WebGL fallback. Whenever it has been on screen, the 3D starts
  // settled (introSettled), i.e. on exactly that frame, and the cross-fade is invisible. After a
  // boot the 3D is normally ready and plays its intro; the still only steps in if the boot ended
  // without it (the wait cap, or Skip).
  const bootDone = useSceneState((s) => s.bootDone);
  const [bootEndedEarly, setBootEndedEarly] = useState(false);
  useEffect(() => {
    if (!bootDone || ready) return;
    // Too late once the intro has started (it plays from empty; the still must not appear over it).
    const id = window.setTimeout(() => !sceneStore.get().introStarted && setBootEndedEarly(true), 0);
    return () => window.clearTimeout(id);
  }, [bootDone, ready]);
  const stillWanted = !STILL_CAPTURE && (bootRan !== true || staticHero || bootEndedEarly);
  // The canvas draws its first real frame (sceneStore.framesShown; see FrameGate) and it is the
  // same picture as the still, which goes in that moment (no fade: both at once would add the
  // glow twice).
  const framesShown = useSceneState((s) => s.framesShown);
  const stillShown = failed || (!framesShown && stillWanted);
  // Decided only once the boot and device are known: the hydration render still has the server's
  // answer (both null, still shown), which would mark every visit settled and skip the intro.
  const known = bootRan !== null && phone !== null;
  useEffect(() => {
    if (STILL_CAPTURE || (known && stillShown && !failed && !sceneStore.get().introStarted)) sceneStore.set({ introSettled: true });
  }, [known, stillShown, failed]);

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
    // column pushed the cluster below the fold on short screens). Its height leaves room for the
    // status row, which sits just below it (outside the 3D frame, so the cluster never covers it).
    <div
      ref={ref}
      data-hero-stage
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[34rem] lg:aspect-auto lg:h-[clamp(19rem,calc(100svh-10.5rem),38rem)] lg:max-w-none lg:self-start",
        // Below lg the stage sits between the name and the pitch (Hero.tsx); on phones it runs
        // edge to edge (past the page padding) so the scene gets the whole width.
        "max-lg:order-2 max-md:-mx-4 max-md:w-[calc(100%+2rem)] max-md:max-w-none",
      )}
    >
      <div className="relative h-full w-full">
        <HeroStill shown={stillShown} />
        {/* Status row + Chaos Monkey: inside the stage's bottom below lg; lg+ just under the stage
            (the fixed canvas is masked there, so the cluster never draws over the button) */}
        <div className="absolute inset-x-0 bottom-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 lg:top-full lg:bottom-auto lg:mt-1.5">
          <p
            className={cn(
              // Room for the longest steady label ("[ OK ] 13/13 nodes ready"), so the row doesn't
              // re-wrap (moving the Chaos button) when "pulling 3D layers…" turns into it.
              "min-w-[22ch] text-center font-mono text-[0.68rem] whitespace-nowrap transition-colors lg:min-w-[24ch]",
              down > 0 ? "text-warning" : clusterReady || !ready ? "text-faint" : "text-cyan",
            )}
            // The Chaos Monkey log announces the run; don't also announce every count change here.
            aria-live={run ? "off" : "polite"}
          >
            {down > 0
              ? `[ WARN ] ${nodes - down}/${nodes} nodes ready`
              : want && !ready && !failed
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
          {/* Plain note for the Chaos Monkey button: inline on desktop (a second row would push the
              status row up into the 3D cluster on short screens), its own row on narrow stages */}
          {!(staticHero && autoCapable === false) && (
            <p className="w-full text-center text-[0.72rem] text-faint lg:w-auto">{site.chaos.note}</p>
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

const STILL_ALT = site.hero.staticImage.alt;

/**
 * The still, art-directed: lg+ gets the desktop capture placed in the camera's frame (the stage
 * plus its bleed) with the camera's own fit rule (STILL_FIT: fixed horizontal FOV, clamped vertical
 * FOV), so it lines up with the 3D at any window size; below lg the square mobile capture fills the
 * stage with the canvas' edge fade. Pure CSS (container units): right from the server HTML.
 * Two layers rebuild the canvas exactly: the shade darkens the page by the canvas' alpha, the light
 * ADDS its colour (plus-lighter), so the glow keeps the brightness a straight-alpha image clips.
 */
function HeroStill({ shown }: { shown: boolean }) {
  const frame = { x: `${-FRAME_BLEED.x * 100}%`, y: `${-FRAME_BLEED.y * 100}%` };
  return (
    <div
      aria-hidden={!shown}
      // No opacity on this wrapper: below 1 it becomes an isolated group, and the light layer would
      // add onto the wrapper's own (black) content instead of the page: a dark square mid-fade.
      // Each layer fades by itself.
      className="absolute inset-0 [container-type:size] lg:inset-x-(--frame-x) lg:inset-y-(--frame-y)"
      style={
        {
          "--frame-x": frame.x,
          "--frame-y": frame.y,
          "--still-w": `clamp(${STILL_FIT.minH * 100}cqh, 100cqw, ${STILL_FIT.maxH * 100}cqh)`,
          "--edge-fade": EDGE_FADE,
        } as CSSProperties
      }
    >
      <StillLayer layer="shade" alt={STILL_ALT} shown={shown} />
      <StillLayer layer="light" alt="" shown={shown} className="mix-blend-screen supports-[mix-blend-mode:plus-lighter]:mix-blend-plus-lighter" />
    </div>
  );
}

function StillLayer({ layer, alt, shown, className }: { layer: "shade" | "light"; alt: string; shown: boolean; className?: string }) {
  const { mobile, desktop } = site.hero.staticImage;
  // Served as captured (sized WebP): the optimizer would only re-encode them, and its cache keeps
  // serving an old capture under the same URL after a re-capture.
  const { props: img } = getImageProps({ alt, src: mobile[layer], width: mobile.width, height: mobile.height, unoptimized: true });
  return (
    <picture>
      {desktop.map((band) => (
        <source
          key={band.minHeight}
          media={band.minHeight > 0 ? `(min-width: 1024px) and (min-height: ${band.minHeight}px)` : "(min-width: 1024px)"}
          srcSet={band[layer]}
          width={band.width}
          height={band.height}
        />
      ))}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img
        {...img}
        className={cn(
          "absolute inset-0 h-full w-full object-contain max-lg:[mask-image:var(--edge-fade)] max-lg:[mask-composite:intersect] max-lg:[-webkit-mask-image:var(--edge-fade)] max-lg:[-webkit-mask-composite:source-in]",
          "lg:inset-auto lg:top-1/2 lg:left-1/2 lg:h-auto lg:w-(--still-w) lg:max-w-none lg:-translate-x-1/2 lg:-translate-y-1/2",
          // Fades in (the grace path), but leaves at once: the canvas above shows the very same frame,
          // and a fade would add the glow twice (still + canvas) for half a second.
          shown ? "transition-opacity duration-500" : "opacity-0",
          className,
        )}
      />
    </picture>
  );
}
