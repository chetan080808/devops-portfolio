"use client";

import { useEffect, useMemo } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { MathUtils, Matrix4, PerspectiveCamera, Quaternion, Scene, Vector2, Vector3, type Mesh, type MeshStandardMaterial } from "three";
import { site } from "@/content/site";
import { miniDropProgress, scrollStory } from "@/lib/scrollStory";
import { MODELS, useModel } from "../assets";
import { disposeMaterials, isNeon } from "../materials";
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
      p1.set(r.left + r.width / 2, r.top + r.height / 2 + BAY_OFFSET_Y);
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
