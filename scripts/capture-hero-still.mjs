#!/usr/bin/env node
// Captures the phone hero still (public/hero/whale-cluster-mobile.webp) from the live 3D scene:
// phone emulation, wait until the scene is ready and settled, hide everything but the canvas,
// screenshot the stage with alpha, write an 816×816 WebP. Re-run whenever the scene's look or
// the mobile framing (MOBILE_FRAME) changes, so the still and the 3D cross-fade seamlessly.
//
//   node scripts/capture-hero-still.mjs [url] [--out=public/hero/whale-cluster-mobile.webp]
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3300/";
const out = (args.find((a) => a.startsWith("--out=")) ?? "--out=public/hero/whale-cluster-mobile.webp").slice(6);
const SIZE = 816;
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
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
  .then((x) => { if (x.error) throw new Error(`${method}: ${x.error.message}`); return x.result; });
const val = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;

try {
  await send("Page.enable");
  await send("Runtime.enable");
  // DPR chosen so the full-width (390 px) stage is exactly SIZE device px.
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: SIZE / WIDTH, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }] });
  await send("Page.navigate", { url: url + (url.includes("?") ? "&" : "?") + "boot" });

  // Ready = the stage label reports the cluster up; then let the intro finish and the whale settle.
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    if (await val("/nodes ready/.test(document.body.innerText) && !/pulling 3D/.test(document.body.innerText) && !!document.querySelector('canvas')")) break;
    await sleep(500);
  }
  await sleep(12000);

  // Only the canvas remains, on a transparent page, without the stage's CSS edge fade.
  const rect = await val(`(() => {
    const canvas = document.querySelector('canvas');
    const box = canvas.closest('div.absolute') ?? canvas.parentElement;
    box.style.maskImage = 'none'; box.style.webkitMaskImage = 'none';
    const style = document.createElement('style');
    style.textContent = '*{visibility:hidden!important} html,body{background:transparent!important}';
    document.head.appendChild(style);
    box.style.setProperty('visibility', 'visible', 'important');
    box.querySelectorAll('*').forEach((el) => el.style.setProperty('visibility', 'visible', 'important'));
    const r = box.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  })()`);
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await sleep(600);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { ...rect, scale: 1 }, captureBeyondViewport: true });
  const png = Buffer.from(shot.data, "base64");
  await sharp(png).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`${out}: ${meta.width}×${meta.height}, alpha ${meta.hasAlpha}, stage ${Math.round(rect.width)}×${Math.round(rect.height)} css px`);
} finally {
  ws.close();
  proc.kill();
}
