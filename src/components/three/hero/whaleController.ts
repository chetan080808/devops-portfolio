import { Box3, MathUtils, Vector2, Vector3, type Object3D, type PerspectiveCamera } from "three";
import { canvasOrigin, heroLayout } from "../heroLayout";
import { pointer, pointerFollowing } from "../pointer";
import { fromCanvasPx, toCanvasPx } from "../projection";
import { SWIM } from "./choreography";
import { whaleScreen } from "./tracking";
import { DROP_PIN_AT, scrollStory } from "@/lib/scrollStory";

const smooth = (t: number) => t * t * (3 - 2 * t);

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
  private flipHold = 0;
  private theta = 0;
  private bobPhase = 0;
  private flickT = 0;
  private flickCooldown = 0;
  private wasOver = false;
  private frame = 0;
  /** 4a: the cards have unpinned and scroll on; the whale goes with them */
  private leaving = false;
  /** Viewport px where the whale was when the transition started (it then only blends to the drop) */
  private anchor: { x: number; y: number } | null = null;
  /** Camera position last frame (to ride along with the scroll pan) */
  private lastCam: Vector3 | null = null;
  /** Current swim plane (world z) */
  private z: number = SWIM.z;
  /** Canvas origin (page px) for this frame: hero geometry is stored in page coordinates */
  private o = { x: 0, y: 0 };
  /** Screen y (canvas px) of the cluster's top edge: helm wheel, nodes, container */
  private obstacleTop = Infinity;
  private obstacleBottom = -Infinity;
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
    // 4a: as Deployments scrolls in, the whale leaves the hero and swims down above the cards.
    const ap = heroLayout.fullBleed ? smooth(scrollStory.approach) : 0;
    // The moment the transition starts, ONLY the drop choreography drives the whale: no cursor
    // follow, no idle path. `calm` ramps the motion down to slow, level, profile-only swimming.
    const dropMode = heroLayout.fullBleed && scrollStory.approach > 0.001;
    const calm = dropMode ? MathUtils.clamp(scrollStory.approach * 10, 0, 1) : 0;
    // The camera pans with the scroll (CameraRig). During the transition the whale rides along
    // with that pan, so its spring only handles motion ON SCREEN: a slow, calm spring can then never
    // be left behind by fast scrolling (it used to drop off the bottom when scrolling back up).
    // (Not while leaving: then it stays put in the world and scrolls away with the cards.)
    if (this.lastCam && dropMode && !this.leaving) {
      const dx = camera.position.x - this.lastCam.x;
      const dy = camera.position.y - this.lastCam.y;
      const dz = camera.position.z - this.lastCam.z;
      this.pos.x += dx;
      this.pos.y += dy;
      this.pos.z += dz;
      whale.position.copy(this.pos);
    }
    (this.lastCam ??= new Vector3()).copy(camera.position);
    if (!dropMode) {
      this.leaving = false;
      this.anchor = null;
    } else if (!this.anchor) {
      // Freeze where it was (viewport px): from here it only blends toward the drop point.
      this.anchor = { x: centrePx.x, y: centrePx.y };
    }
    // Swim plane moves toward the camera during the transition: the whale passes in FRONT of the
    // receding hero cluster instead of clipping through it.
    this.z = MathUtils.lerp(SWIM.z, SWIM.drop.z, ap);
    const following = !still && !dropMode && pointerFollowing();

    // ── Target (px → world on the swim plane)
    if (this.anchor) {
      px.set(this.anchor.x, this.anchor.y);
    } else if (following) {
      // The cursor's position across the whole visible hero maps onto the roaming band, so every
      // mouse move (up/down, left/right) clearly moves the whale.
      const L = heroLayout;
      const hx0 = L.hero.x0 - window.scrollX;
      const hx1 = L.hero.x1 - window.scrollX;
      const hy0 = Math.max(L.navBottom, L.hero.y0 - window.scrollY);
      const hy1 = Math.min(window.innerHeight, L.hero.y1 - window.scrollY);
      const nx = MathUtils.clamp((pointer.client.x - hx0) / Math.max(1, hx1 - hx0), 0, 1);
      const ny = MathUtils.clamp((pointer.client.y - hy0) / Math.max(1, hy1 - hy0), 0, 1);
      px.set(MathUtils.lerp(zone.x0, zone.x1, nx), MathUtils.lerp(zone.y0, zone.y1, ny));
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
    if (ap > 0) {
      const g = this.grid();
      if (g) {
        const r = g.getBoundingClientRect();
        // Over the right-hand card: the section heading and intro text are left-aligned, so the
        // whale never covers them while it hovers above the cards.
        const dx = Math.min(r.left + r.width * SWIM.drop.x, r.right - this.ext.right - SWIM.rightMargin);
        // After the cards unpin and scroll on, the whale leaves with them (fading under the navbar).
        this.leaving = r.top < window.innerHeight * DROP_PIN_AT - 4;
        const above = r.top - SWIM.drop.gap - this.ext.down;
        const dy = this.leaving ? above : Math.max(above, heroLayout.navBottom + SWIM.headroom + this.ext.up);
        px.set(MathUtils.lerp(px.x, dx, ap), MathUtils.lerp(px.y, dy, ap));
      }
    }
    fromCanvasPx(px.x, px.y, this.z, camera, w, h, targetWorld);
    if (!still) {
      this.bobPhase += ((Math.PI * 2) / SWIM.bob.period) * dt;
      targetWorld.y += SWIM.bob.amplitude * (1 - 0.6 * calm) * Math.sin(this.bobPhase);
    }

    // ── Position spring
    if (still) {
      this.pos.copy(targetWorld);
      this.vel.set(0, 0, 0);
    } else {
      const k = MathUtils.lerp(SWIM.spring.stiffness, SWIM.calm.stiffness, calm);
      const c = MathUtils.lerp(SWIM.spring.damping, SWIM.calm.damping, calm);
      this.vel.x += (k * (targetWorld.x - this.pos.x) - c * this.vel.x) * dt;
      this.vel.y += (k * (targetWorld.y - this.pos.y) - c * this.vel.y) * dt;
      this.vel.z = 0;
      const maxSpeed = MathUtils.lerp(SWIM.maxSpeed, SWIM.calm.maxSpeed, calm);
      if (this.vel.length() > maxSpeed) this.vel.setLength(maxSpeed);
      this.pos.addScaledVector(this.vel, dt);
      this.pos.z = this.z;
    }

    // ── Hard limits: keep the centre inside the zone (so the box never crosses text/navbar).
    // Drop mode: the hero has scrolled away, only the navbar headroom still applies.
    toCanvasPx(this.pos, camera, w, h, centrePx);
    const cx = dropMode ? centrePx.x : MathUtils.clamp(centrePx.x, zone.x0, zone.x1);
    const cy = dropMode
      ? this.leaving
        ? centrePx.y
        : Math.max(centrePx.y, zone.y0)
      : MathUtils.clamp(centrePx.y, zone.y0, zone.y1);
    if (cx !== centrePx.x || cy !== centrePx.y) {
      fromCanvasPx(cx, cy, this.z, camera, w, h, clampedWorld);
      if (cx !== centrePx.x) this.vel.x = 0;
      if (cy !== centrePx.y) this.vel.y = 0;
      this.pos.x = clampedWorld.x;
      this.pos.y = clampedWorld.y;
    }

    // ── Heading: face the direction of travel (keeps its last direction when still)
    const speed = Math.hypot(this.vel.x, this.vel.y);
    // Flip only on a clear, sustained change of direction (no flip-flopping through "away").
    // Transition (4a): face left, toward the cards the minis drop into — no other turns.
    const wantLeft = dropMode || this.vel.x < 0;
    if ((dropMode || Math.abs(this.vel.x) > 0.5) && wantLeft !== this.faceLeft) {
      this.flipHold += dt;
      if (this.flipHold > 0.12) {
        this.faceLeft = wantLeft;
        this.flipHold = 0;
      }
    } else this.flipHold = 0;
    const aTarget = this.faceLeft ? SWIM.side : -SWIM.side;
    if (still) {
      this.a = aTarget;
      this.aVel = 0;
    } else {
      const tk = MathUtils.lerp(SWIM.turn.stiffness, SWIM.calm.turnStiffness, calm);
      const tc = MathUtils.lerp(SWIM.turn.damping, SWIM.calm.turnDamping, calm);
      this.aVel += (tk * (aTarget - this.a) - tc * this.aVel) * dt;
      this.a = MathUtils.clamp(this.a + this.aVel * dt, -SWIM.side - 0.1, SWIM.side + 0.1);
    }

    // ── Hover tail flick: once each time the cursor touches the whale (not while it rests on it)
    this.flickCooldown -= dt;
    this.flickT = Math.max(0, this.flickT - dt);
    const over = !still && !dropMode && pointer.enabled && pointer.inside && this.hovered();
    if (over && !this.wasOver && this.flickCooldown <= 0) {
      this.flickT = SWIM.flick.duration;
      this.flickCooldown = SWIM.flick.cooldown;
    }
    this.wasOver = over;
    const flick = this.flickT / SWIM.flick.duration; // 1 → 0
    const flickRoll = flick > 0 ? SWIM.flick.roll * Math.sin((1 - flick) * Math.PI * 4) * flick : 0;

    // Pitch only reads well in profile: seen from behind it looks like "pointing straight up",
    // so it fades out as the heading passes through "away from camera" (a → 0). Same for bank.
    const profile = Math.pow(Math.min(1, Math.abs(Math.sin(this.a)) / Math.sin(SWIM.side)), 2);
    // During the transition: level — pitch and roll fade to ~0.
    const level = 1 - 0.92 * calm;
    const pitch =
      MathUtils.clamp(Math.atan2(this.vel.y, Math.max(Math.abs(this.vel.x), 0.6)) * 0.8, -SWIM.maxPitch, SWIM.maxPitch) *
      profile *
      level;
    const bank =
      (MathUtils.clamp(this.aVel * SWIM.bankGain, -SWIM.maxBank, SWIM.maxBank) * (0.4 + 0.6 * profile) + flickRoll) * level;
    const swimRate = still
      ? 0
      : 1 +
        (0.9 * Math.min(1, speed / 2) + 0.5 * Math.min(1, Math.abs(this.aVel) / 3)) * (1 - 0.7 * calm) +
        SWIM.flick.tailBoost * flick;

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
    const dropMode = smooth(scrollStory.approach) > 0.02;
    const dx = dropMode ? 0 : Math.max(0, L.text.x1 - o.x + LIMITS.textGap - this.screenBox.x0);
    let dy = this.leaving ? 0 : Math.max(0, L.navBottom + LIMITS.headroom - this.screenBox.y0);
    if (dy === 0 && !dropMode) {
      // Above the cluster: push up, but never into the headroom.
      const over = this.screenBox.y1 - (this.obstacleTop - SWIM.clusterGap);
      const room = this.screenBox.y0 - (L.navBottom + LIMITS.headroom);
      if (over > 0) dy = -Math.min(over, Math.max(0, room));
    }
    if (dx === 0 && dy === 0) return;
    fromCanvasPx(centrePx.x + dx, centrePx.y + dy, this.z, camera, w, h, clampedWorld);
    this.pos.x = clampedWorld.x;
    this.pos.y = clampedWorld.y;
    if (dx > 0) this.vel.x = Math.max(0, this.vel.x);
    if (dy > 0) this.vel.y = Math.min(0, this.vel.y);
    if (dy < 0) this.vel.y = Math.max(0, this.vel.y);
    whale.position.copy(this.pos);
    this.measure(whale, camera, w, h);
  }

  private gridEl: HTMLElement | null = null;
  /** The project grid the minis drop into (4a) */
  private grid() {
    if (!this.gridEl?.isConnected) this.gridEl = document.querySelector<HTMLElement>("[data-project-grid]");
    return this.gridEl;
  }

  /** Top edge (canvas px) of everything the whale must stay above. Cheap; refreshed every 20 frames. */
  private measureObstacles(scene: Object3D, camera: PerspectiveCamera, w: number, h: number) {
    let top = Infinity;
    let bottom = -Infinity;
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
        const y = toCanvasPx(corner, camera, w, h, px).y;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    });
    this.obstacleTop = top;
    this.obstacleBottom = bottom;
  }

  /** Shrink (never grow past 1) so the whale fits between the headroom and the cluster. */
  private updateFit(dt: number) {
    const L = heroLayout;
    if (!L.fullBleed || !Number.isFinite(this.obstacleTop)) return;
    const room =
      this.obstacleTop - SWIM.clusterGap - (L.navBottom + SWIM.headroom) - 2 * SWIM.bob.px - SWIM.minTravelY;
    const height = this.ext.up + this.ext.down;
    if (height <= 0) return;
    let target = MathUtils.clamp((this.fit * room) / height, SWIM.minFit, 1);
    // Drop mode: fit between the navbar headroom and the top of the project cards instead.
    const ap = smooth(scrollStory.approach);
    const g = ap > 0 ? this.grid() : null;
    if (g) {
      const roomDrop = g.getBoundingClientRect().top - SWIM.drop.gap - (L.navBottom + SWIM.headroom) - 2 * SWIM.bob.px;
      const dropTarget = MathUtils.clamp((this.fit * roomDrop) / height, SWIM.minFit, SWIM.drop.maxFit);
      target = MathUtils.lerp(target, dropTarget, ap);
    }
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
    Object.assign(whaleScreen, { x0, y0, x1, y1, on: true });
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
    const y0 = (L.fullBleed ? L.navBottom + SWIM.headroom : 0) + this.ext.up;
    // Headroom wins over the fold if both can't be met.
    // Never down over the cluster / helm wheel; the fold bounds it too. Headroom wins a conflict
    // (the whale shrinks to fit instead, see updateFit).
    const floor = h - SWIM.foldMargin;
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

