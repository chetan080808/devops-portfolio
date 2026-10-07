import { Vector2 } from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { canvasOrigin, heroLayout } from "./heroLayout";

/** Clearance the mask fades in over, right of the text (matches the whale's 32 px gap). */
const FEATHER = 32;
/**
 * The hero scene fades out toward the bottom of its stage frame (stage + 7% bleed, as the old
 * in-stage canvas did), over this share of the stage height — hides the floor grid's far lines.
 */
const BLEED_Y = 0.07;
const BOTTOM_FADE = 0.17;

/**
 * Last pass of the HERO scene only (detached minis render afterwards, unmasked): multiplies the
 * premultiplied output by a mask, so nothing of the hero scene shows behind the text, below its
 * stage, or hard against the right edge. Uniforms follow the scroll every frame.
 */
export function createHeroMaskPass() {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new Vector2(1, 1) },
      uOn: { value: 0 },
      uTextRight: { value: 0 },
      uHeroBottom: { value: 0 },
      uFeather: { value: FEATHER },
      uBottomFade: { value: BOTTOM_FADE },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uRes;
      uniform float uOn, uTextRight, uHeroBottom, uFeather, uBottomFade;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes; // canvas px, y down
        float m = smoothstep(uTextRight, uTextRight + uFeather, p.x);
        m *= 1.0 - smoothstep(uHeroBottom - uBottomFade, uHeroBottom, p.y);
        m *= 1.0 - smoothstep(uRes.x * 0.965, uRes.x, p.x);
        gl_FragColor = c * mix(1.0, m, uOn);
      }`,
  });
  return pass;
}

/** Refresh the mask for the current scroll / layout (call before rendering each frame). */
export function updateHeroMask(pass: ShaderPass, w: number, h: number) {
  const u = pass.uniforms;
  const on = heroLayout.fullBleed;
  u.uOn.value = on ? 1 : 0;
  u.uRes.value.set(w, h);
  if (!on) return;
  const o = canvasOrigin();
  u.uTextRight.value = heroLayout.text.x1 - o.x;
  const { stage } = heroLayout;
  const sh = stage.y1 - stage.y0;
  u.uHeroBottom.value = stage.y1 + sh * BLEED_Y - o.y;
  u.uBottomFade.value = sh * BOTTOM_FADE;
}
