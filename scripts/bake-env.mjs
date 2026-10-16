#!/usr/bin/env node
// Bakes the hero's studio environment map (public/env/studio-cubeuv.png) from the live scene.
// The page, opened with ?bake-env, builds the light-panel environment the old way (drei
// <Environment> + PMREM) and exposes the PMREM result (three's "cube UV" layout, half floats);
// this script stores it as an sRGB PNG scaled by `scale` (written to src/components/three/envBake.ts).
// At runtime the PNG is used directly as a cube-UV env map: no cube camera, no PMREM shaders.
// Re-run whenever the Lightformers in Lighting.tsx change.
//
//   node scripts/bake-env.mjs [url]   (a running prod build, e.g. http://localhost:3200/)
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const url = process.argv[2] ?? "http://localhost:3200/";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9337;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "pf-env-"))}`,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--window-size=1280,800",
  "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id) { pending.get(x.id)?.(x); pending.delete(x.id); } };
if (ws.readyState !== WebSocket.OPEN) await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
  .then((x) => { if (x.error) throw new Error(`${method}: ${x.error.message}`); return x.result; });
const val = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;

/** IEEE half float → number */
function half(h) {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const f = h & 0x3ff;
  if (e === 0) return s * 2 ** -14 * (f / 1024);
  if (e === 31) return f ? NaN : s * Infinity;
  return s * 2 ** (e - 15) * (1 + f / 1024);
}
const toSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

try {
  await send("Page.enable");
  await send("Page.navigate", { url: url + (url.includes("?") ? "&" : "?") + "bake-env" });
  let bake = null;
  for (let i = 0; i < 120 && !bake; i++) {
    await sleep(500);
    bake = await val("window.__envBake ?? null");
  }
  if (!bake) throw new Error("no env bake from the page (is it a build with the ?bake-env hook?)");
  const { width, height, data } = bake;
  const lin = Float32Array.from(data, half);
  let max = 0;
  for (let i = 0; i < lin.length; i++) if (i % 4 !== 3 && Number.isFinite(lin[i])) max = Math.max(max, lin[i]);
  // Headroom so the brightest panel isn't clipped; a round-ish number keeps the source readable.
  const scale = Math.ceil(max * 100) / 100;
  // readPixels rows are bottom-up; the texture is uploaded with flipY = false, so row 0 stays first.
  const rgb = Buffer.alloc(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    for (let c = 0; c < 3; c++) {
      const v = Math.max(0, lin[p * 4 + c]) / scale;
      rgb[p * 3 + c] = Math.round(Math.min(1, toSrgb(v)) * 255);
    }
  }
  mkdirSync("public/env", { recursive: true });
  const out = "public/env/studio-cubeuv.png";
  await sharp(rgb, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9 }).toFile(out);
  writeFileSync(
    "src/components/three/envBake.ts",
    `// Written by scripts/bake-env.mjs: do not edit by hand.\n` +
      `/** Baked studio environment (cube-UV layout, sRGB PNG); texel value = sRGB decode × scale. */\n` +
      `export const ENV_BAKE = { url: "/env/studio-cubeuv.png", width: ${width}, height: ${height}, scale: ${scale} } as const;\n`,
  );
  const meta = await sharp(out).metadata();
  console.log(`${out}: ${meta.width}×${meta.height}, max texel ${max.toFixed(3)} → scale ${scale}`);
} finally {
  ws.close();
  proc.kill();
}
