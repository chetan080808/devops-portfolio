"use client";

import { useEffect, useMemo } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Box3,
  CanvasTexture,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  type MeshStandardMaterial,
} from "three";
import { site } from "@/content/site";
import { accentHex, statusAccent } from "@/lib/accent";
import { miniDropProgress, scrollStory } from "@/lib/scrollStory";
import { MODELS, useModel } from "../assets";
import { disposeMaterials, isNeon } from "../materials";
import { extraScenes } from "../precompile";
import { toCanvasPx, worldPerPixel } from "../projection";
import { buildMini, miniRegistry } from "./minis";

/** Overlay depth (world units in front of the camera) a parked mini sits at */
const PARK_DEPTH = 6;
/**
 * Landed pose relative to the line of sight: upright, side-on (long corrugated side to the
 * viewer, aligned with the bay), tilted just enough to show the roof.
 */
const PARKED_TILT = 0.28;
// Yaw −90° (long side to the viewer), THEN tilt about the view's horizontal axis — composing in
// this order keeps the container level (a "YXZ" Euler here rolls it instead).
const PARKED = new Quaternion()
  .setFromAxisAngle(new Vector3(1, 0, 0), PARKED_TILT)
  .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2));
/** Native on-screen extent in that pose: length × (height·cos + width·sin), plus a margin */
const PARKED_W = 1.72;
const PARKED_H = 0.98;
/** Share of the bay the landed mini may fill — it always sits fully inside */
const BAY_FILL = { w: 0.74, h: 0.6 };
/** The bay's labels sit along its top: centre the mini a little lower */
const BAY_OFFSET_Y = 8;
/** Landing flash: neon multiplier peak and decay rate (1/s) */
const FLASH = { peak: 3.2, decay: 4 };
/** How high (px) the arc lifts above the start before dropping into the card */
const ARC_LIFT = 70;
/** Card hover: the landed mini lifts (px) and turns a little (rad about the view's up axis) */
const HOVER = { lift: 7, yaw: 0.16, roll: -0.035, rate: 9 };
/**
 * Status LED on the roof: same blink as the 2D container (globals.css led-blink, 2.6 s: steady,
 * then a quick double blink). Returns brightness 0.15..1.
 */
const LED_PERIOD = 2.6;
function ledLevel(t: number) {
  const f = (t % LED_PERIOD) / LED_PERIOD;
  const dips = [0.66, 0.75];
  return dips.some((d) => Math.abs(f - d) < 0.025) ? 0.15 : 1;
}

/** Soft round glow for the LED halo (the overlay pass has no bloom). */
function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.35, "rgba(255,255,255,0.35)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

const p0 = new Vector2();
const p1 = new Vector2();
const ctrl = new Vector2();
const screen = new Vector2();
const startPos = new Vector3();
const startQuat = new Quaternion();
const startScale = new Vector3();
const forward = new Vector3();
const tmp = new Vector3();
const dir = new Vector3();
const endQuat = new Quaternion();
const wobble = new Quaternion();
/** Plain (not lens-shifted) camera for the overlay; follows the hero camera's pose each frame. */
const camera = new PerspectiveCamera(30, 1, 0.1, 100);
/** Smooth start, long soft landing */
const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const softLand = (t: number) => 1 - (1 - t) * (1 - t);
const camUp = new Vector3();
const faceMat = new Matrix4();
const hoverTurn = new Quaternion();
const hoverRoll = new Quaternion();

/**
 * 4a: as Deployments scrolls in, each mini leaves the whale's back and drops into its project
 * card's slot (`[data-mini-slot]`), then rides the card while it scrolls. Driven purely by
 * `scrollStory.drop` (GSAP scrub), so it is fully reversible.
 *
 * Detached minis live in their own overlay scene rendered after the (masked) hero pass with a
 * plain camera: the hero camera is lens-shifted for the hero composition, which would skew
 * objects far down the viewport. Hand-over matches on-screen position and size exactly.
 */
export function MiniDrop() {
  const { scene: containerScene } = useModel(MODELS.container);
  const overlay = useMemo(() => new Scene(), []);
  // Warm its shaders up with the rest during the boot (its lights differ from the hero scene's).
  useEffect(() => {
    extraScenes.add(overlay);
    return () => void extraScenes.delete(overlay);
  }, [overlay]);
  const minis = useMemo(
    () =>
      site.projects.map(() => {
        const m = buildMini(containerScene);
        m.visible = false;
        return m;
      }),
    [containerScene],
  );
  // Per-mini neon materials (own clones) for the landing flash.
  const neon = useMemo(
    () =>
      minis.map((m) => {
        const mats: MeshStandardMaterial[] = [];
        m.traverse((o) => {
          const mat = (o as Mesh).material;
          if (mat && !Array.isArray(mat) && isNeon(mat)) mats.push(mat);
        });
        return { mats, base: mats.map((x) => x.emissiveIntensity), flash: 0, prevQ: 0 };
      }),
    [minis],
  );
  // Status LEDs: a small unlit dot + additive halo on the roof corner that faces the viewer once
  // parked (local +x side, the end on the screen's right), in the project's status colour.
  const leds = useMemo(() => {
    const box = new Box3().setFromObject(containerScene);
    const size = box.getSize(new Vector3());
    const geo = new SphereGeometry(0.035, 12, 8);
    const tex = haloTexture();
    return minis.map((mini, i) => {
      const color = accentHex[statusAccent[site.projects[i].status]];
      const dot = new Mesh(geo, new MeshBasicMaterial({ color, toneMapped: false, transparent: true }));
      const halo = new Sprite(
        new SpriteMaterial({ map: tex, color, blending: AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
      );
      halo.scale.setScalar(0.22);
      const at = new Vector3(box.max.x - size.x * 0.22, box.max.y + 0.02, box.min.z + size.z * 0.12);
      dot.position.copy(at);
      halo.position.copy(at);
      dot.visible = halo.visible = false;
      mini.add(dot, halo);
      return { dot, halo, geo, tex };
    });
  }, [minis, containerScene]);
  useEffect(
    () => () => {
      leds.forEach(({ dot, halo }) => {
        (dot.material as MeshBasicMaterial).dispose();
        halo.material.dispose();
      });
      leds[0]?.geo.dispose();
      leds[0]?.tex.dispose();
    },
    [leds],
  );
  // Card hover, eased per mini (0..1)
  const hover = useMemo(() => minis.map(() => 0), [minis]);
  useEffect(() => () => minis.forEach(disposeMaterials), [minis]);

  useEffect(() => {
    scrollStory.dropActive = true;
    document.documentElement.dataset.minis = "webgl";
    return () => {
      scrollStory.dropActive = false;
      delete document.documentElement.dataset.minis;
      miniRegistry.attached.forEach((m) => (m.visible = true));
    };
  }, []);

  // Poses (before the hero pass renders at priority 1, so hand-over never shows both / neither).
  useFrame((state, delta) => {
    const main = state.camera as PerspectiveCamera;
    const { width: w, height: h } = state.size;
    const P = scrollStory.drop;
    const n = minis.length;

    if (camera.aspect !== w / h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    main.updateMatrixWorld();
    camera.position.copy(main.position);
    camera.quaternion.copy(main.quaternion);
    camera.updateMatrixWorld();
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const slots = document.querySelectorAll<HTMLElement>("[data-mini-slot]");
    const time = state.clock.elapsedTime;

    minis.forEach((mini, i) => {
      const attached = miniRegistry.attached[i];
      const slot = slots[i];
      const q = miniDropProgress(P, i, n);
      const fx = neon[i];
      if (q >= 0.995 && fx.prevQ < 0.995) fx.flash = 1; // landed (scrolling down)
      fx.prevQ = q;
      fx.flash = Math.max(0, fx.flash - delta * FLASH.decay);
      const boost = 1 + (FLASH.peak - 1) * fx.flash;
      fx.mats.forEach((m, k) => (m.emissiveIntensity = fx.base[k] * boost));
      const led = leds[i];
      const landed = q >= 0.995;
      led.dot.visible = led.halo.visible = landed;
      if (landed) {
        const l = ledLevel(time);
        (led.dot.material as MeshBasicMaterial).opacity = l;
        led.halo.material.opacity = 0.85 * l;
      }
      const hovered = landed && !!slot?.closest("article")?.matches(":hover");
      hover[i] = MathUtils.damp(hover[i], hovered ? 1 : 0, HOVER.rate, delta);
      if (q <= 0 || !attached || !slot || attached.scale.x === 0) {
        mini.visible = false;
        if (attached) attached.visible = true;
        return;
      }
      attached.visible = false;
      mini.visible = true;

      // Start: where the mini sits on the whale right now (screen point, depth, px per unit).
      attached.updateWorldMatrix(true, false);
      attached.matrixWorld.decompose(startPos, startQuat, startScale);
      toCanvasPx(startPos, main, w, h, p0);
      const d0 = tmp.subVectors(startPos, main.position).dot(forward);
      const k0 = startScale.x / worldPerPixel(main, d0, h);

      // End: the card's slot (the desktop canvas is fixed, so viewport px = canvas px).
      const r = slot.getBoundingClientRect();
      p1.set(r.left + r.width / 2, r.top + r.height / 2 + BAY_OFFSET_Y - HOVER.lift * hover[i]);
      const k1 = Math.min((r.width * BAY_FILL.w) / PARKED_W, (r.height * BAY_FILL.h) / PARKED_H);

      // Path: eased start, decelerating into the bay (lands softly, no snap).
      const e = q < 0.5 ? easeInOut(q) : 0.5 + softLand((q - 0.5) / 0.5) * 0.5;
      ctrl.set(MathUtils.lerp(p0.x, p1.x, 0.3), Math.min(p0.y, p1.y) - ARC_LIFT);
      screen
        .copy(p0)
        .multiplyScalar((1 - e) * (1 - e))
        .addScaledVector(ctrl, 2 * (1 - e) * e)
        .addScaledVector(p1, e * e);
      const depth = MathUtils.lerp(d0, PARK_DEPTH, e);
      const k = k0 * Math.pow(k1 / k0, e);

      // Unproject the screen point at that depth with the overlay camera.
      dir.set((screen.x / w) * 2 - 1, 1 - (screen.y / h) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
      mini.position.copy(camera.position).addScaledVector(dir, depth / dir.dot(forward));
      const overlayWpp = (2 * depth * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / h;
      mini.scale.setScalar(k * overlayWpp);

      // Turn from its ride pose into the parked three-quarter pose, tumbling a little mid-flight.
      // Turn from its ride pose into the landed pose. The landed pose faces THIS mini's line of
      // sight (not the camera axis) with the camera's up kept as up: no perspective tilt, no roll.
      camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      faceMat.lookAt(camera.position, mini.position, camUp);
      endQuat.setFromRotationMatrix(faceMat).multiply(PARKED);
      mini.quaternion.slerpQuaternions(startQuat, endQuat, Math.min(1, e * 1.15));
      wobble.setFromAxisAngle(forward, Math.sin(Math.PI * e) * 0.18);
      mini.quaternion.premultiply(wobble);
      // Living card: hovered, the landed container turns a little toward the viewer and tilts.
      if (hover[i] > 0.001) {
        hoverTurn.setFromAxisAngle(camUp, HOVER.yaw * hover[i]);
        hoverRoll.setFromAxisAngle(forward, HOVER.roll * hover[i]);
        mini.quaternion.premultiply(hoverTurn).premultiply(hoverRoll);
      }
    });
  });

  // Overlay pass, after the hero composer (priority 1).
  useFrame(({ gl }) => {
    if (!minis.some((m) => m.visible)) return;
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.clearDepth();
    gl.render(overlay, camera);
    gl.autoClear = autoClear;
  }, 2);

  return createPortal(
    <>
      <ambientLight intensity={0.75} color="#b8c2e6" />
      <directionalLight position={[3, 9, 14]} intensity={2.2} color="#eef1ff" />
      <directionalLight position={[-6, 2, 4]} intensity={0.6} color="#8b5cf6" />
      {minis.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>,
    overlay,
  );
}
