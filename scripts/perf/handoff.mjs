#!/usr/bin/env node
// Still → 3D handoff check (DECISIONS D-52). Repeat visit (boot skipped): the hero still is on
// screen until the 3D's first visible frame. Records the page with a screencast and reports how
// much the stage changes from frame to frame, around the switch vs. during plain idle motion: a
// visible reset / rebuild shows up as a jump at the switch.
//
//   node scripts/perf/handoff.mjs [url] [--size=1440x900] [--phone | --lowend] [--dpr=3] [--dump=dir [--strip]]
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3200/";
// --lowend: a 2-core phone (no auto 3D): the still stays until "load 3D anyway" is tapped.
const lowend = args.includes("--lowend");
const phone = args.includes("--phone") || lowend;
const [W, H] = (args.find((a) => a.startsWith("--size="))?.slice(7) ?? (phone ? "390x844" : "1440x900")).split("x").map(Number);
// --dpr=N: device pixel ratio (phones are 2–3; the canvas caps at 1.5 there, as in the capture)
const dpr = Number(args.find((a) => a.startsWith("--dpr="))?.slice(6) ?? (phone ? 3 : 1));
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9338;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "pf-handoff-"))}`,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--window-size=1500,1000",
  "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const frames = [];
ws.onmessage = (m) => {
  const x = JSON.parse(m.data);
  if (x.id) { pending.get(x.id)?.(x); pending.delete(x.id); }
  else if (x.method === "Page.screencastFrame") {
    frames.push({ t: x.params.metadata.timestamp, data: x.params.data });
    ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck", params: { sessionId: x.params.sessionId } }));
  }
};
if (ws.readyState !== WebSocket.OPEN) await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
  .then((x) => { if (x.error) throw new Error(`${method}: ${x.error.message}`); return x.result; });
const val = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result.value;

// The switch = the moment the still is hidden (the canvas shows its first real frame then), wall clock s.
const WATCH = `(() => {
  const go = () => {
    const img = document.querySelector('[data-hero-stage] picture img');
    if (!img) return requestAnimationFrame(go);
    const check = () => { if (img.classList.contains('opacity-0') && !window.__switchAt) window.__switchAt = Date.now() / 1000; };
    new MutationObserver(check).observe(img, { attributes: true, attributeFilter: ['class'] });
  };
  go();
})()`;

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: dpr, mobile: phone });
  // --reduce: prefers-reduced-motion
  if (args.includes("--reduce") && !phone) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (lowend) await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 2 });
  if (phone) {
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }] });
  }
  // First visit: the boot runs and marks the session; the repeat visit then skips it.
  await send("Page.navigate", { url });
  await sleep(9000);
  await send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH });
  await send("Page.startScreencast", { format: "jpeg", quality: 90, everyNthFrame: 1 });
  await send("Page.reload", { ignoreCache: false });
  if (lowend) {
    await sleep(3000);
    const tapped = await val(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /load 3D anyway/.test(x.textContent)); b?.click(); return !!b; })()`);
    if (!tapped) throw new Error("no 'load 3D anyway' button");
  }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && !(await val("window.__switchAt ?? null").catch(() => null))) await sleep(200);
  await sleep(2500);
  await send("Page.stopScreencast");
  const switchAt = await val("window.__switchAt ?? null");
  const still = await val("[...document.querySelectorAll('[data-hero-stage] picture img')].map((i) => i.currentSrc.split('/').pop() + ' ' + Math.round(i.getBoundingClientRect().width)).join(', ')");
  const boot = await val("document.documentElement.dataset.boot");
  // The camera frame (desktop) or the stage (phone), viewport px.
  const r = await val(`(() => {
    const s = document.querySelector('[data-hero-stage]').getBoundingClientRect();
    // The scene only: the status row (its label changes text around the same moment) is cut off.
    const row = document.querySelector('[data-hero-stage] button[aria-describedby="chaos-hint"]')?.parentElement?.getBoundingClientRect();
    const bx = ${phone ? 0 : 0.09} * s.width, by = ${phone ? 0 : 0.07} * s.height;
    const x0 = Math.max(0, s.left - bx), y0 = Math.max(0, s.top - by);
    const y1 = Math.min(innerHeight, s.bottom + by, row ? row.top - 4 : Infinity);
    return { x: x0, y: y0, w: Math.min(innerWidth, s.right + bx) - x0, h: y1 - y0 };
  })()`);
  if (!switchAt) throw new Error("no switch seen");

  // Mean absolute difference (0–255) of the region between consecutive frames.
  const crop = async (f) => {
    const img = sharp(Buffer.from(f.data, "base64"));
    const { width } = await img.metadata();
    const k = width / W;
    return img.extract({ left: Math.round(r.x * k), top: Math.round(r.y * k), width: Math.round(r.w * k), height: Math.round(r.h * k) }).resize(200).raw().toBuffer();
  };
  const near = frames.filter((f) => f.t > switchAt - 1.2 && f.t < switchAt + 2.2);
  const rows = [];
  let prev = null;
  let prevFrame = null;
  let worst = { diff: -1 };
  for (const f of near) {
    const px = await crop(f);
    if (prev) {
      let d = 0;
      for (let i = 0; i < px.length; i++) d += Math.abs(px[i] - prev[i]);
      const row = { dt: +(f.t - switchAt).toFixed(3), diff: +(d / px.length).toFixed(2) };
      rows.push(row);
      if (Math.abs(row.dt) <= 0.12 && row.diff > worst.diff) worst = { ...row, a: prevFrame, b: f };
    }
    prev = px;
    prevFrame = f;
  }
  // --dump=dir: the two frames around the biggest change at the switch
  const dump = args.find((a) => a.startsWith("--dump="))?.slice(7);
  if (dump && args.includes("--strip")) {
    // Every frame from 0.25 s before to 0.25 s after the switch, stage only, side by side.
    const strip = frames.filter((f) => Math.abs(f.t - switchAt) < 0.25);
    const tiles = [];
    for (const f of strip) tiles.push(await sharp(await crop(f), { raw: { width: 200, height: Math.round((200 * r.h) / r.w), channels: 3 } }).png().toBuffer());
    const th = Math.round((200 * r.h) / r.w);
    await sharp({ create: { width: 200 * tiles.length, height: th, channels: 3, background: "#000" } })
      .composite(tiles.map((input, i) => ({ input, left: i * 200, top: 0 })))
      .png()
      .toFile(join(dump, "handoff-strip.png"));
    console.log("strip dt:", strip.map((f) => +(f.t - switchAt).toFixed(3)).join(" "));
  }
  if (dump && worst.a) {
    await sharp(Buffer.from(worst.a.data, "base64")).toFile(join(dump, "handoff-before.png"));
    await sharp(Buffer.from(worst.b.data, "base64")).toFile(join(dump, "handoff-after.png"));
  }
  const at = rows.filter((x) => Math.abs(x.dt) <= 0.12);
  const idle = rows.filter((x) => x.dt > 0.8);
  const max = (a) => Math.max(0, ...a.map((x) => x.diff));
  console.log(JSON.stringify({ size: `${W}x${H}`, phone, boot, still, frames: rows.length, switchMax: max(at), idleMax: max(idle), around: at }, null, 1));
} finally {
  ws.close();
  proc.kill();
}
