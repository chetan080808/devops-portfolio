#!/usr/bin/env node
// Phone-sized screenshots of the site over the DevTools protocol (separate Chrome, fresh profile):
// mobile viewport + DPR, touch, pointer: coarse, mobile UA, optional CPU throttling and emulated
// device capabilities. Takes one viewport screenshot per stop (section ids or pixel offsets).
//
//   node scripts/perf/mobile.mjs [url] [--width=390] [--height=844] [--cpu=4] [--out=dir]
//        [--stops=top,deployments,pipeline,metrics,contact] [--memory=8] [--cores=8] [--save-data]
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) ?? "https://chetannamane.com/";
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) ?? `=${d}`).split("=").slice(1).join("=");
const has = (n) => args.includes(`--${n}`);
const width = Number(opt("width", 390));
const height = Number(opt("height", 844));
const cpu = Number(opt("cpu", 1));
const out = opt("out", join(tmpdir(), "pf-mobile"));
const stops = opt("stops", "top,deployments,pipeline,metrics,contact").split(",");
const memory = Number(opt("memory", 8));
const cores = Number(opt("cores", 8));
const saveData = has("save-data");
const wait = Number(opt("wait", 0)); // extra ms after load before the first screenshot
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(out, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), "pf-mob-"));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run",
  "--no-default-browser-check", "--disable-extensions", "--window-size=600,1000",
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
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 3, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }, { name: "hover", value: "none" }] });
  await send("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
    userAgentMetadata: { mobile: true, platform: "Android", platformVersion: "14", architecture: "", model: "Pixel 7", brands: [] },
  });
  if (cpu > 1) await send("Emulation.setCPUThrottlingRate", { rate: cpu });
  await send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: cores });
  // deviceMemory and Save-Data have no direct CDP switch: shim them before any page script runs.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${memory} });
    if (navigator.connection) Object.defineProperty(navigator.connection, 'saveData', { get: () => ${saveData} });
  ` });

  await send("Page.navigate", { url });
  await sleep(4000 * Math.max(1, cpu / 2) + wait);
  const info = await val(`({ vw: innerWidth, vh: innerHeight, docH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth > innerWidth, canvas: !!document.querySelector('canvas'),
    boot: document.documentElement.dataset.boot })`);
  console.log(JSON.stringify(info));

  for (const stop of stops) {
    const y = /^\d+$/.test(stop) ? Number(stop) : await val(`(() => { const el = document.getElementById(${JSON.stringify(stop)}); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : 0 })()`);
    await val(`scrollTo({ top: ${y}, behavior: 'instant' }); 1`);
    await sleep(1500 * Math.max(1, cpu / 2));
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: await val("scrollY"), width, height, scale: 1 }, captureBeyondViewport: false });
    const file = join(out, `${width}-${stop}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log(file);
  }
} finally {
  ws.close();
  proc.kill();
}
