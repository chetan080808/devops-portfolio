import { Box3, MathUtils, Vector2, Vector3, type Object3D, type PerspectiveCamera } from "three";
import { canvasOrigin, heroLayout } from "../heroLayout";
import { pointer, pointerFollowing } from "../pointer";
import { fromCanvasPx, toCanvasPx } from "../projection";
import { SWIM } from "./choreography";

export interface SwimPose {
  position: Vector3;
  yaw: number;
  pitch: number;
  bank: number;
  /** Swim-cycle playback rate (tail beats faster while moving / turning / flicking) */
  swimRate: number;
}

const corner = new Vector3();
const obstacleBox = new Box3();
/** GLB root names of the cluster pieces the whale must stay above */
const OBSTACLES = new Set(["ClusterNode", "HelmWheel", "ShippingContainer"]);
const homePx = new Vector2();
/** World point the idle home hovers at (above the helm wheel), in the swim plane */
const HOME_ANCHOR = new Vector3(0, 3.95, SWIM.z);
/** The spec: never closer than this to the text column / the navbar (px). */
const LIMITS = { textGap: 32, headroom: 40 };
const px = new Vector2();
const centrePx = new Vector2();
const targetWorld = new Vector3();
const clampedWorld = new Vector3();

/**
 * Spring-driven swimming after the intro. Each frame:
 *  1. measure the whale's on-screen box (so limits hold whatever its pose),
 *  2. build the zone its centre may occupy: right of the text (+32 px), below the navbar
 *     (+40 px), above the fold, left of the canvas edge,
 *  3. target = cursor clamped into the zone, or the idle figure-eight around home,
 *  4. spring toward it, then hard-clamp the result into the zone (exact, via unprojection),
 *  5. heading from horizontal travel / cursor side, turning only through "away from camera".
 */
export class WhaleController {
  readonly pos = new Vector3();
  private vel = new Vector3();
  private a = SWIM.side; // heading parameter, see SWIM.side
  private aVel = 0;
  private faceLeft = true;
  private theta = 0;
  private bobPhase = 0;
  private flickT = 0;
  private flickCooldown = 0;
  private wasOver = false;
  private frame = 0;
  /** Canvas origin (page px) for this frame: hero geometry is stored in page coordinates */
  private o = { x: 0, y: 0 };
  /** Screen y (canvas px) of the cluster's top edge: helm wheel, nodes, container */
  private obstacleTop = Infinity;
  /**
   * Scale factor (≤ 1) applied on top of WHALE_SCALE when the gap between the navbar headroom
   * and the cluster is shorter than the whale (short laptop screens).
   */
  fit = 1;
  private started = false;
  /** Box extents around the projected centre (px), from the previous frame */
  private ext = { left: 150, right: 150, up: 80, down: 80 };
  readonly screenBox = { x0: 0, y0: 0, x1: 0, y1: 0 };

  /** @param localBox the whale's bounds (incl. minis) in its own unscaled, unrotated space */
  constructor(private readonly localBox: Box3 | null) {}

  /** Take over from the intro path at the whale's current pose. */
  start(position: Vector3, yaw: number) {
    this.pos.copy(position);
    this.vel.set(0, 0, 0);
    this.a = MathUtils.euclideanModulo(yaw - Math.PI + Math.PI, Math.PI * 2) - Math.PI;
    this.aVel = 0;
    this.faceLeft = this.a > 0;
    this.started = true;
  }

  get active() {
    return this.started;
  }

  update(dt: number, whale: Object3D, scene: Object3D, camera: PerspectiveCamera, w: number, h: number, still: boolean): SwimPose {
    dt = Math.min(dt, 1 / 20);
    const origin = canvasOrigin();
    this.o.x = origin.x;
    this.o.y = origin.y;
    if (this.frame++ % 20 === 0) this.measureObstacles(scene, camera, w, h);
    this.measure(whale, camera, w, h);
    this.updateFit(dt);
    const zone = this.zone(w, h);
    const following = !still && pointerFollowing();

    // ── Target (px → world on the swim plane)
    if (following) {
      const cx = pointer.client.x + window.scrollX - this.o.x;
      const cy = pointer.client.y + window.scrollY - this.o.y;
      px.set(MathUtils.clamp(cx, zone.x0, zone.x1), MathUtils.clamp(cy, zone.y0, zone.y1));
    } else {
      if (!still) this.theta += ((Math.PI * 2) / SWIM.idle.period) * dt;
      const homeX = MathUtils.clamp(SWIM.idle.homeX * heroLayout.viewportW + window.scrollX - this.o.x, zone.x0, zone.x1);
      // Home height: a fixed point above the cluster, so on tall screens it stays close to the
      // cluster instead of drifting to the top; short screens clamp it below the headroom.
      toCanvasPx(HOME_ANCHOR, camera, w, h, homePx);
      const homeY = MathUtils.clamp(homePx.y, zone.y0 + SWIM.idle.y, Math.max(zone.y0 + SWIM.idle.y, zone.y1 - SWIM.idle.y));
      px.set(
        MathUtils.clamp(homeX + SWIM.idle.x * Math.sin(this.theta), zone.x0, zone.x1),
        MathUtils.clamp(homeY + SWIM.idle.y * Math.sin(2 * this.theta), zone.y0, zone.y1),
      );
    }
    fromCanvasPx(px.x, px.y, SWIM.z, camera, w, h, targetWorld);
    if (!still) {
      this.bobPhase += ((Math.PI * 2) / SWIM.bob.period) * dt;
      targetWorld.y += SWIM.bob.amplitude * Math.sin(this.bobPhase);
    }

    // ── Position spring
    if (still) {
      this.pos.copy(targetWorld);
      this.vel.set(0, 0, 0);
    } else {
      const { stiffness: k, damping: c } = SWIM.spring;
      this.vel.x += (k * (targetWorld.x - this.pos.x) - c * this.vel.x) * dt;
      this.vel.y += (k * (targetWorld.y - this.pos.y) - c * this.vel.y) * dt;
      this.vel.z = 0;
      if (this.vel.length() > SWIM.maxSpeed) this.vel.setLength(SWIM.maxSpeed);
      this.pos.addScaledVector(this.vel, dt);
      this.pos.z = SWIM.z;
    }

    // ── Hard limits: keep the centre inside the zone (so the box never crosses text/navbar)
    toCanvasPx(this.pos, camera, w, h, centrePx);
    const cx = MathUtils.clamp(centrePx.x, zone.x0, zone.x1);
    const cy = MathUtils.clamp(centrePx.y, zone.y0, zone.y1);
    if (cx !== centrePx.x || cy !== centrePx.y) {
      fromCanvasPx(cx, cy, SWIM.z, camera, w, h, clampedWorld);
      if (cx !== centrePx.x) this.vel.x = 0;
      if (cy !== centrePx.y) this.vel.y = 0;
      this.pos.x = clampedWorld.x;
      this.pos.y = clampedWorld.y;
    }

    // ── Heading: face the direction of travel; when (nearly) still, face the cursor
    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (Math.abs(this.vel.x) > 0.35) this.faceLeft = this.vel.x < 0;
    else if (following) {
      fromCanvasPx(
        pointer.client.x + window.scrollX - this.o.x,
        centrePx.y,
        SWIM.z,
        camera,
        w,
        h,
        clampedWorld,
      );
      const dx = clampedWorld.x - this.pos.x;
      if (Math.abs(dx) > 0.3) this.faceLeft = dx < 0;
    }
    const aTarget = this.faceLeft ? SWIM.side : -SWIM.side;
    if (still) {
      this.a = aTarget;
      this.aVel = 0;
    } else {
      this.aVel += (SWIM.turn.stiffness * (aTarget - this.a) - SWIM.turn.damping * this.aVel) * dt;
      this.a = MathUtils.clamp(this.a + this.aVel * dt, -SWIM.side - 0.1, SWIM.side + 0.1);
    }

    // ── Hover tail flick: once each time the cursor touches the whale (not while it rests on it)
    this.flickCooldown -= dt;
    this.flickT = Math.max(0, this.flickT - dt);
    const over = !still && pointer.enabled && pointer.inside && this.hovered();
    if (over && !this.wasOver && this.flickCooldown <= 0) {
      this.flickT = SWIM.flick.duration;
      this.flickCooldown = SWIM.flick.cooldown;
    }
    this.wasOver = over;
    const flick = this.flickT / SWIM.flick.duration; // 1 → 0
    const flickRoll = flick > 0 ? SWIM.flick.roll * Math.sin((1 - flick) * Math.PI * 4) * flick : 0;

    const pitch = MathUtils.clamp(Math.atan2(this.vel.y, Math.max(Math.abs(this.vel.x), 0.6)) * 0.8, -SWIM.maxPitch, SWIM.maxPitch);
    const bank = MathUtils.clamp(this.aVel * SWIM.bankGain, -SWIM.maxBank, SWIM.maxBank) + flickRoll;
    const swimRate = still
      ? 0
      : 1 + 0.9 * Math.min(1, speed / 2) + 0.5 * Math.min(1, Math.abs(this.aVel) / 3) + SWIM.flick.tailBoost * flick;

    return { position: this.pos, yaw: Math.PI + this.a, pitch, bank, swimRate };
  }

  /**
   * Final pass after this frame's pose (rotation, scale) is applied: re-measure and push the
   * whale clear of the text / navbar by any remaining overlap, at the exact spec distances.
   * (Turning changes the on-screen box within a frame, after the spring step has run.)
   */
  constrain(whale: Object3D, camera: PerspectiveCamera, w: number, h: number) {
    const L = heroLayout;
    if (!L.fullBleed) return;
    this.measure(whale, camera, w, h);
    const o = canvasOrigin();
    const dx = Math.max(0, L.text.x1 - o.x + LIMITS.textGap - this.screenBox.x0);
    let dy = Math.max(0, L.navBottom - o.y + LIMITS.headroom - this.screenBox.y0);
    if (dy === 0) {
      // Above the cluster: push up, but never into the headroom.
      const over = this.screenBox.y1 - (this.obstacleTop - SWIM.clusterGap);
      const room = this.screenBox.y0 - (L.navBottom - o.y + LIMITS.headroom);
      if (over > 0) dy = -Math.min(over, Math.max(0, room));
    }
    if (dx === 0 && dy === 0) return;
    fromCanvasPx(centrePx.x + dx, centrePx.y + dy, SWIM.z, camera, w, h, clampedWorld);
    this.pos.x = clampedWorld.x;
    this.pos.y = clampedWorld.y;
    if (dx > 0) this.vel.x = Math.max(0, this.vel.x);
    if (dy > 0) this.vel.y = Math.min(0, this.vel.y);
    if (dy < 0) this.vel.y = Math.max(0, this.vel.y);
    whale.position.copy(this.pos);
    this.measure(whale, camera, w, h);
  }

  /** Top edge (canvas px) of everything the whale must stay above. Cheap; refreshed every 20 frames. */
  private measureObstacles(scene: Object3D, camera: PerspectiveCamera, w: number, h: number) {
    let top = Infinity;
    scene.traverse((o) => {
      if (!OBSTACLES.has(o.name) || !o.visible) return;
      obstacleBox.setFromObject(o);
      if (obstacleBox.isEmpty()) return;
      for (let i = 0; i < 8; i++) {
        corner.set(
          i & 1 ? obstacleBox.max.x : obstacleBox.min.x,
          i & 2 ? obstacleBox.max.y : obstacleBox.min.y,
          i & 4 ? obstacleBox.max.z : obstacleBox.min.z,
        );
        top = Math.min(top, toCanvasPx(corner, camera, w, h, px).y);
      }
    });
    this.obstacleTop = top;
  }

  /** Shrink (never grow past 1) so the whale fits between the headroom and the cluster. */
  private updateFit(dt: number) {
    const L = heroLayout;
    if (!L.fullBleed || !Number.isFinite(this.obstacleTop)) return;
    const room = this.obstacleTop - SWIM.clusterGap - (L.navBottom - this.o.y + SWIM.headroom) - 2 * SWIM.bob.px;
    const height = this.ext.up + this.ext.down;
    if (height <= 0) return;
    const target = MathUtils.clamp((this.fit * room) / height, SWIM.minFit, 1);
    // Shrink quickly (it must never touch the cluster), grow back slowly.
    this.fit += (target - this.fit) * Math.min(1, dt * (target < this.fit ? 10 : 2));
  }

  /**
   * On-screen box of the whale (incl. minis) and its extents around the projected centre.
   * Projects the whale's own oriented box (`localBox`, whale-group space) rather than a
   * world-axis box around it, which overestimates badly while it's turned.
   */
  private measure(whale: Object3D, camera: PerspectiveCamera, w: number, h: number) {
    const box = this.localBox;
    if (!box) return;
    whale.updateWorldMatrix(true, false);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      corner.applyMatrix4(whale.matrixWorld);
      toCanvasPx(corner, camera, w, h, px);
      x0 = Math.min(x0, px.x);
      x1 = Math.max(x1, px.x);
      y0 = Math.min(y0, px.y);
      y1 = Math.max(y1, px.y);
    }
    Object.assign(this.screenBox, { x0, y0, x1, y1 });
    whale.getWorldPosition(corner);
    toCanvasPx(corner, camera, w, h, centrePx);
    this.ext = { left: centrePx.x - x0, right: x1 - centrePx.x, up: centrePx.y - y0, down: y1 - centrePx.y };
  }

  /** Allowed rectangle for the whale's projected centre (canvas px). */
  private zone(w: number, h: number) {
    const L = heroLayout;
    const o = this.o;
    const right = L.fullBleed ? Math.min(w, L.viewportW + window.scrollX - o.x) : w;
    const x0 = (L.fullBleed ? L.text.x1 - o.x + SWIM.textGap : 0) + this.ext.left;
    const x1 = Math.max(x0, right - SWIM.rightMargin - this.ext.right);
    const y0 = (L.fullBleed ? L.navBottom - o.y + SWIM.headroom : 0) + this.ext.up;
    // Headroom wins over the fold if both can't be met.
    // Never down over the cluster / helm wheel; the fold bounds it too. Headroom wins a conflict
    // (the whale shrinks to fit instead, see updateFit).
    const floor = (L.fullBleed ? L.foldBottom - o.y : h) - SWIM.foldMargin;
    const clusterFloor = L.fullBleed ? this.obstacleTop - SWIM.clusterGap : Infinity;
    const y1 = Math.max(y0, Math.min(floor, clusterFloor) - this.ext.down);
    return { x0, x1, y0, y1 };
  }

  private hovered() {
    const cx = pointer.client.x + window.scrollX - this.o.x;
    const cy = pointer.client.y + window.scrollY - this.o.y;
    const { x0, y0, x1, y1 } = this.screenBox;
    const ix = (x1 - x0) * 0.15;
    const iy = (y1 - y0) * 0.15;
    return cx > x0 + ix && cx < x1 - ix && cy > y0 + iy && cy < y1 - iy;
  }
}

