"use client";

import { useEffect, useMemo } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Euler, MathUtils, PerspectiveCamera, Quaternion, Scene, Vector2, Vector3 } from "three";
import { site } from "@/content/site";
import { miniDropProgress, scrollStory } from "@/lib/scrollStory";
import { DRACO_PATH, MODELS } from "../assets";
import { disposeMaterials } from "../materials";
import { toCanvasPx, worldPerPixel } from "../projection";
import { buildMini, miniRegistry } from "./minis";

/** Overlay depth (world units in front of the camera) a parked mini sits at */
const PARK_DEPTH = 6;
/** Native mini size used to fit the card slot (≈ its diagonal in the parked three-quarter view) */
const MINI_SPAN = 1.75;
const SLOT_FILL = 0.74;
/** Parked orientation relative to the camera: doors toward camera-left, top visible */
const PARKED = new Quaternion().setFromEuler(new Euler(0.38, -0.95, 0, "YXZ"));
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
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
  const { scene: containerScene } = useGLTF(MODELS.container, DRACO_PATH);
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
  useFrame((state) => {
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
      p1.set(r.left + r.width / 2, r.top + r.height / 2);
      const k1 = (r.width * SLOT_FILL) / MINI_SPAN;

      const e = easeInOut(q);
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
      endQuat.copy(camera.quaternion).multiply(PARKED);
      mini.quaternion.slerpQuaternions(startQuat, endQuat, e);
      wobble.setFromAxisAngle(forward, Math.sin(Math.PI * e) * 0.45);
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
