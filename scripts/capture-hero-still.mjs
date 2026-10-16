#!/usr/bin/env node
// Captures the hero stills from the live 3D scene, in capture mode (?still): the scene starts
// settled and stops at its first visible frame (HeroCanvas FIRST_VISIBLE_FRAME), exactly the
// frame the 3D takes over with when the still was on screen (DECISIONS D-52). The pixels are read
// raw from the canvas and stored as two layers, <name>-shade.webp + <name>-light.webp (see below).
//   phone (default): 390 px phone emulation, the square stage at the canvas' resolution
//   --desktop[=1440x900]: the camera's frame (stage + FRAME_BLEED) at that window size. Pick sizes
//   whose frame aspect stays inside the unclamped FOV range (0.91–1.43, see cameraFit.ts): HeroStill
//   scales a still by that rule. Short windows are captured narrow for this (1024x495).
// Re-run whenever the scene's look, the settled pose or the framing changes (and copy the printed
// desktop size into site.ts).
//
//   node scripts/capture-hero-still.mjs [url] [--desktop=1440x900 | --desktop=1366x680 | --desktop=1024x495] [--out=…]
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3300/";
// --desktop[=WxH]: the frame (and so the scene and its glow) scales with the window height, and
// bloom spreads in screen pixels: one capture per height band (site.ts staticImage.desktop).
const desktopArg = args.find((a) => a === "--desktop" || a.startsWith("--desktop="));
const desktop = !!desktopArg;
const [DW, DH] = (desktopArg?.includes("=") ? desktopArg.slice(10) : "1440x900").split("x").map(Number);
const out = (
  args.find((a) => a.startsWith("--out=")) ??
  (desktop ? `--out=public/hero/whale-cluster-desktop-${DH}.webp` : "--out=public/hero/whale-cluster-mobile.webp")
).slice(6);
const DESKTOP = { width: DW, height: DH, dpr: 1, bleed: { x: 0.09, y: 0.07 } };
const WIDTH = 390;
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9336;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "pf-still-"))}`,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--window-size=600,1000",
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

try {
  await send("Page.enable");
  await send("Runtime.enable");
  if (desktop) {
    await send("Emulation.setDeviceMetricsOverride", { width: DESKTOP.width, height: DESKTOP.height, deviceScaleFactor: DESKTOP.dpr, mobile: false });
  } else {
    // A real phone's DPR: the canvas caps it at 1.5 (DPR_MOBILE), like on the device.
    await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: 3, mobile: true });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }] });
  }
  await send("Page.navigate", { url: url + (url.includes("?") ? "&" : "?") + "boot&still" });

  // Capture mode flags the first (and only) frame.
  const t0 = Date.now();
  while (Date.now() - t0 < 90000 && !(await val("!!window.__stillFrame"))) await sleep(300);
  const frame = await val("window.__stillFrame ?? null");
  if (!frame) throw new Error("no capture frame (is it a build with ?still?)");

  // The region to keep, in page CSS px: the camera's frame (desktop: stage + bleed, see
  // CameraRig / cameraFit.ts) or the whole in-stage canvas (phone).
  const rect = desktop
    ? await val(`(() => {
        const stage = document.querySelector('[data-hero-stage]').getBoundingClientRect();
        const bx = stage.width * ${DESKTOP.bleed.x}, by = stage.height * ${DESKTOP.bleed.y};
        return { x: stage.left - bx + scrollX, y: stage.top - by + scrollY, width: stage.width + 2 * bx, height: stage.height + 2 * by };
      })()`)
    : frame.rect;
  // Raw premultiplied RGBA, bottom-up rows → top-down, then the region.
  const { width: bw, height: bh } = frame.size;
  const raw = Buffer.from(frame.raw, "base64");
  const flipped = Buffer.alloc(raw.length);
  for (let y = 0; y < bh; y++) raw.copy(flipped, (bh - 1 - y) * bw * 4, y * bw * 4, (y + 1) * bw * 4);
  const k = bw / frame.rect.width; // canvas px per CSS px (the canvas' DPR after the pixel budget)
  const region = {
    left: Math.round((rect.x - frame.rect.x) * k),
    top: Math.round((rect.y - frame.rect.y) * k),
    width: Math.round(rect.width * k),
    height: Math.round(rect.height * k),
  };
  // The frame's bleed can reach past the canvas (nothing is drawn there): pad with transparency.
  const inside = {
    left: Math.max(0, region.left),
    top: Math.max(0, region.top),
    width: Math.min(bw, region.left + region.width) - Math.max(0, region.left),
    height: Math.min(bh, region.top + region.height) - Math.max(0, region.top),
  };
  const rgba = await sharp(flipped, { raw: { width: bw, height: bh, channels: 4 } })
    .extract(inside)
    .extend({
      left: inside.left - region.left,
      top: inside.top - region.top,
      right: region.left + region.width - (inside.left + inside.width),
      bottom: region.top + region.height - (inside.top + inside.height),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer();
  // Two layers reproduce the canvas exactly: page × (1 − alpha) + premultiplied colour.
  //   *-shade.webp: black with the canvas' alpha (normal blending → page × (1 − alpha))
  //   *-light.webp: the premultiplied colour on black, opaque (added with mix-blend-mode: plus-lighter)
  const n = region.width * region.height;
  const shade = Buffer.alloc(n * 4);
  const light = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    shade[i * 4 + 3] = rgba[i * 4 + 3];
    light[i * 3] = rgba[i * 4];
    light[i * 3 + 1] = rgba[i * 4 + 1];
    light[i * 3 + 2] = rgba[i * 4 + 2];
  }
  // Native canvas resolution (the canvas never renders finer than this), lossless: resampling and
  // lossy chroma blur the thin neon lines, which then visibly sharpen at the switch.
  const size = { width: region.width, height: region.height };
  const fit = (img) => img;
  const base = out.replace(/\.webp$/, "");
  await fit(sharp(shade, { raw: { width: region.width, height: region.height, channels: 4 } }))
    .webp({ lossless: true, effort: 6 })
    .toFile(`${base}-shade.webp`);
  await fit(sharp(light, { raw: { width: region.width, height: region.height, channels: 3 } }))
    .webp({ lossless: true, effort: 6 })
    .toFile(`${base}-light.webp`);
  console.log(`${base}-{shade,light}.webp: ${size.width}×${size.height} (${desktop ? "frame" : "stage"} ${Math.round(rect.width)}×${Math.round(rect.height)} css px, canvas ×${k.toFixed(2)})`);
} finally {
  ws.close();
  proc.kill();
}
