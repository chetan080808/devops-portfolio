import { Vector2, Vector4, type Texture } from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { whaleScreen } from "./hero/tracking";
import { canvasOrigin, heroLayout } from "./heroLayout";

/** Clearance the text mask fades in over, right of the text (matches the whale's 32 px gap). */
const FEATHER = 32;
/**
 * The hero scene fades out toward the bottom of its stage frame (stage + 7% bleed, as the old
 * in-stage canvas did), over this share of the stage height — hides the floor grid's far lines.
 */
const BLEED_Y = 0.07;
const BOTTOM_FADE = 0.17;
/** Soft edge around the whale's always-visible box, and the fade under the fixed navbar (px) */
const WHALE_FEATHER = 24;
const NAV_FADE = 36;
/**
 * Scroll-out: as the hero scrolls away the camera pans, the cluster rises toward the top of the
 * frame and is seen ever more edge-on (and the violet rims dominate). Fade the scene (not the
 * whale) between these shares of the stage centre's resting distance to the navbar, so it's gone
 * before it distorts. Relative to that distance, every window size fades at the same point
 * (and never at rest).
 */
export const SCROLL_FADE_FROM = 0.1;
export const SCROLL_FADE_TO = 0.45;

/**
 * Last pass of the HERO scene only (detached minis render afterwards, unmasked). Multiplies the
 * premultiplied output by a mask: nothing of the hero scene behind the hero text, below its stage,
 * hard against the right edge, or under the navbar. The whale's own box stays visible wherever it
 * swims (4a takes it down over the cards). Uniforms follow the scroll every frame.
 */
export function createHeroMaskPass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new Vector2(1, 1) },
      uOn: { value: 0 },
      uTextRight: { value: 0 },
      uHeroBottom: { value: 0 },
      uStageBottom: { value: 0 },
      uBottomFade: { value: 1 },
      uNavBottom: { value: 0 },
      uSceneFade: { value: 1 },
      tWhaleSil: { value: null as Texture | null },
      uSilOn: { value: 0 },
      uWhale: { value: new Vector4() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tWhaleSil;
      uniform float uSilOn;
      uniform vec2 uRes;
      uniform vec4 uWhale; // x0, y0, x1, y1 (canvas px, y down)
      uniform float uOn, uTextRight, uHeroBottom, uStageBottom, uBottomFade, uNavBottom, uSceneFade;
      varying vec2 vUv;
      const float FEATHER = ${FEATHER.toFixed(1)};
      const float WF = ${WHALE_FEATHER.toFixed(1)};
      const float NAV = ${NAV_FADE.toFixed(1)};
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes; // canvas px, y down
        // Scene: hidden left of the text (only alongside the hero), below the stage, at the right edge.
        float text = smoothstep(uTextRight, uTextRight + FEATHER, p.x);
        text = max(text, step(uHeroBottom, p.y));
        float scene = text;
        scene *= 1.0 - smoothstep(uStageBottom - uBottomFade, uStageBottom, p.y);
        scene *= 1.0 - smoothstep(uRes.x * 0.965, uRes.x, p.x);
        scene *= uSceneFade;
        // The whale stays visible wherever it is.
        vec2 dIn = min(p - uWhale.xy, uWhale.zw - p);
        float whale = smoothstep(-WF, 0.0, min(dIn.x, dIn.y));
        // While the scene fades, keep only the whale's own pixels inside its box (dilated a little
        // for its glow); otherwise the half-faded cluster would show at full strength in the box.
        if (uSilOn > 0.5) {
          vec2 o = 8.0 / uRes;
          float s = texture2D(tWhaleSil, vUv).a;
          s = max(s, texture2D(tWhaleSil, vUv + vec2(o.x, 0.0)).a);
          s = max(s, texture2D(tWhaleSil, vUv - vec2(o.x, 0.0)).a);
          s = max(s, texture2D(tWhaleSil, vUv + vec2(0.0, o.y)).a);
          s = max(s, texture2D(tWhaleSil, vUv - vec2(0.0, o.y)).a);
          s = max(s, texture2D(tWhaleSil, vUv + o * 0.7).a);
          s = max(s, texture2D(tWhaleSil, vUv - o * 0.7).a);
          s = max(s, texture2D(tWhaleSil, vUv + vec2(o.x, -o.y) * 0.7).a);
          s = max(s, texture2D(tWhaleSil, vUv + vec2(-o.x, o.y) * 0.7).a);
          whale *= mix(s, 1.0, uSceneFade);
        }
        float m = max(scene, whale);
        // Fade under the fixed navbar.
        m *= smoothstep(uNavBottom - NAV * 0.5, uNavBottom + NAV * 0.5, p.y);
        gl_FragColor = c * mix(1.0, m, uOn);
      }`,
  });
}

/**
 * Refresh the mask for the current scroll / layout (call before rendering each frame). Returns
 * the scroll-out fade (1 = hero scene fully shown, 0 = gone; always 1 without the mask).
 */
export function updateHeroMask(pass: ShaderPass, w: number, h: number): number {
  const u = pass.uniforms;
  const on = heroLayout.fullBleed;
  u.uOn.value = on ? 1 : 0;
  u.uRes.value.set(w, h);
  u.uSilOn.value = 0;
  u.uSceneFade.value = 1;
  if (!on) return 1;
  const o = canvasOrigin();
  const { stage } = heroLayout;
  const sh = stage.y1 - stage.y0;
  u.uTextRight.value = heroLayout.text.x1 - o.x;
  u.uHeroBottom.value = heroLayout.hero.y1 - o.y;
  u.uStageBottom.value = stage.y1 + sh * BLEED_Y - o.y;
  u.uBottomFade.value = Math.max(1, sh * BOTTOM_FADE);
  // The navbar is fixed and so is the desktop canvas: its bottom is a constant canvas y.
  u.uNavBottom.value = heroLayout.navBottom;
  // Resting distance from the stage centre to the navbar (stage = page geometry at scroll 0).
  const rest = Math.max(1, (stage.y0 + stage.y1) / 2 - heroLayout.navBottom);
  const k = (window.scrollY - SCROLL_FADE_FROM * rest) / ((SCROLL_FADE_TO - SCROLL_FADE_FROM) * rest);
  const f = 1 - Math.min(1, Math.max(0, k));
  u.uSceneFade.value = f * f * (3 - 2 * f);
  const W = whaleScreen;
  if (W.on) u.uWhale.value.set(W.x0, W.y0, W.x1, W.y1);
  else u.uWhale.value.set(-1e5, -1e5, -1e5, -1e5);
  // Silhouette only mid-fade: at 0 the hero set isn't drawn at all, so the plain box is enough.
  const fade = u.uSceneFade.value;
  u.uSilOn.value = W.on && fade > 0 && fade < 0.999 ? 1 : 0;
  return fade;
}
