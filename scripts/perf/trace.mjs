#!/usr/bin/env node
// Frame-rate / long-task profiler for the live site, driven over the Chrome DevTools Protocol.
// Launches a separate Chrome (fresh profile, no extensions), records a performance trace while
// it plays four scenarios, and prints per-scenario numbers:
//   intro    load with ?boot → boot → cluster forms → container opens → whale emerges
//   idle     settled hero, synthetic cursor moving across it
//   drop     wheel-scroll from the hero through the project cards (minis drop)
//   pipeline wheel-scroll through the pinned Jenkins pipeline
//
//   node scripts/perf/trace.mjs [url] [--runs=N] [--warm] [--out=dir] [--keep] [--size=1920x1080]
//   --size  emulated viewport (CSS px, DPR 1), larger than the laptop screen if needed
//   --warm  run once untimed first (HTTP + GPU shader cache warm, like a repeat visitor)
//
// No dependencies: Node >= 22 (global WebSocket) and a local Chrome.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) ?? "https://chetannamane.com/";
const flag = (name, dflt) => {
  const a = args.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!a) return dflt;
  return a.includes("=") ? a.split("=")[1] : true;
};
const runs = Number(flag("runs", 1));
const warm = Boolean(flag("warm", false));
const outDir = flag("out", null);
const keep = Boolean(flag("keep", false));
// --trace=0: no DevTools trace (tracing itself costs frames); frame + WebGL numbers only.
const tracing = flag("trace", "1") !== "0";
const size = flag("size", null);
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Chrome + CDP plumbing ----------

function launch() {
  const profile = mkdtempSync(join(tmpdir(), "pf-perf-"));
  const proc = spawn(chrome, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--window-position=0,0",
    "--window-size=1280,800",
    // Keep rendering at full rate even if the window is covered.
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    "about:blank",
  ], { stdio: "ignore" });
  return { proc, profile };
}

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return cdp(page.webSocketDebuggerUrl);
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not expose a page target");
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const handlers = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) {
      (handlers.get(msg.method) ?? []).forEach((h) => h(msg.params));
    }
  };
  const ready = new Promise((r) => (ws.onopen = r));
  return {
    ready,
    send: (method, params = {}) =>
      new Promise((res, rej) => {
        const i = ++id;
        pending.set(i, { res, rej });
        ws.send(JSON.stringify({ id: i, method, params }));
      }),
    on: (method, h) => handlers.set(method, [...(handlers.get(method) ?? []), h]),
    once: (method) => new Promise((r) => {
      const h = (p) => { handlers.set(method, (handlers.get(method) ?? []).filter((x) => x !== h)); r(p); };
      handlers.set(method, [...(handlers.get(method) ?? []), h]);
    }),
    close: () => ws.close(),
  };
}

// In-page recorder: every rAF timestamp, long tasks and long animation frames (with script
// attribution), tagged with the current scenario (window.__pfPhase, set by the harness).
const RECORDER = `
(() => {
  const rec = { frames: [], longTasks: [], loafs: [] };
  window.__pf = rec;
  window.__pfPhase = 'load';
  // 'intro+' = intro frames after the boot overlay has gone (what the visitor actually watches).
  const phaseNow = () => window.__pfPhase === 'intro' && document.documentElement.dataset.boot === 'done' ? 'intro+' : window.__pfPhase;
  const tick = (t) => { rec.frames.push([t, phaseNow()]); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  // How the boot ended ("[ OK ] pulled N layers" or "[ WARN ] ..."), and when.
  rec.boot = null;
  new MutationObserver((muts, mo) => {
    for (const m of muts) for (const n of m.addedNodes) {
      const t = n.textContent || '';
      if (/\\[ (OK|WARN) \\] (pulled \\d+ layers|still pulling|no GPU|WebGL)/.test(t)) { rec.boot = [t.trim().slice(0, 60), Math.round(performance.now())]; mo.disconnect(); return; }
    }
  }).observe(document, { childList: true, subtree: true });
  // WebGL cost by call: compile/link (getProgramParameter blocks until the driver is done),
  // texture and buffer uploads, plus draw-call counts, all per phase. Calls over 8 ms are
  // listed individually.
  rec.gl = {};
  rec.slowGl = [];
  const wrap = (proto, names) => names.forEach((n) => {
    const orig = proto[n];
    if (!orig) return;
    proto[n] = function (...a) {
      const t = performance.now();
      const r = orig.apply(this, a);
      const d = performance.now() - t;
      // 'intro+' = after the boot overlay is gone: compiles there are visible stutter.
      const ph = window.__pfPhase === 'intro' && document.documentElement.dataset.boot === 'done' ? 'intro+' : window.__pfPhase;
      const k = ph + ' ' + n;
      const s = (rec.gl[k] ??= [0, 0]);
      s[0]++; s[1] += d;
      if (rec.firstDraw == null && n.startsWith('draw') && this.canvas?.width > 300) rec.firstDraw = Math.round(t);
      if (d > 8) {
        // Name the program: three.js puts "#define SHADER_NAME <material>" in every shader, plus
        // tell-tale defines (skinning, instancing, blur kernel) and the output colour space.
        let what = '';
        if (n === 'getProgramParameter' && a[0]) try {
          const src = (this.getAttachedShaders(a[0]) || []).map((sh) => this.getShaderSource(sh)).join('\\n');
          what = ((src.match(/#define SHADER_NAME (.+)/) || [])[1] || '?') +
            (/#define USE_SKINNING/.test(src) ? '+skin' : '') + (/#define USE_INSTANCING\\b/.test(src) ? '+inst' : '') +
            ((src.match(/#define KERNEL_RADIUS (\\d+)/) || [])[1] ? '+k' + src.match(/#define KERNEL_RADIUS (\\d+)/)[1] : '') +
            (/sRGBTransferOETF\\( gl_FragColor|linearToOutputTexel\\( vec4 value \\) { return sRGB/.test(src) ? ' →sRGB' : ' →linear');
        } catch {}
        rec.slowGl.push([Math.round(t), n + (what ? ' ' + what : ''), Math.round(d), ph]);
      }
      return r;
    };
  });
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) if (C) wrap(C.prototype, [
    'compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'getProgramInfoLog',
    'texImage2D', 'texSubImage2D', 'texStorage2D', 'generateMipmap', 'bufferData', 'bufferSubData',
    'drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'readPixels',
    'blitFramebuffer', 'renderbufferStorageMultisample', 'framebufferTexture2D']);
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) =>
      rec.longTasks.push([e.startTime, e.duration, window.__pfPhase]))).observe({ type: 'longtask', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => rec.loafs.push({
      start: e.startTime, dur: e.duration, block: e.blockingDuration, phase: window.__pfPhase,
      scripts: e.scripts.map((s) => ({ fn: s.sourceFunctionName, src: (s.sourceURL || '').split('/').pop(),
        inv: s.invoker, type: s.invokerType, dur: Math.round(s.duration), comp: Math.round(s.forcedStyleAndLayoutDuration) })),
    }))).observe({ type: 'long-animation-frame', buffered: true });
  } catch {}
})();`;

// ---------- scenarios ----------

async function phase(c, name) {
  await c.send("Runtime.evaluate", { expression: `window.__pfPhase=${JSON.stringify(name)}; performance.mark('pf:${name}')` });
}
const evaluate = async (c, expr) =>
  (await c.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

async function wheel(c, totalPx, pxPerEvent, everyMs, x = 640, y = 400) {
  for (let done = 0; done < totalPx; done += pxPerEvent) {
    await c.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY: pxPerEvent });
    await sleep(everyMs);
  }
}

async function scenarioRun(c, label) {
  await c.send("Page.navigate", { url: url + (url.includes("?") ? "&" : "?") + "boot" });
  await c.once("Page.loadEventFired");
  await phase(c, "intro");
  // Boot (<= ~3 s) + intro choreography; wait until the hero says the whale has settled.
  const t0 = Date.now();
  await sleep(4000);
  while (Date.now() - t0 < 25000) {
    const settled = await evaluate(c, "document.documentElement.dataset.boot === 'done' && !!document.querySelector('canvas')");
    if (settled && Date.now() - t0 > 13000) break;
    await sleep(250);
  }

  await phase(c, "idle");
  // Cursor sweeps over the hero in a slow figure, 60 Hz, 8 s.
  for (let i = 0; i < 480; i++) {
    const a = (i / 480) * Math.PI * 4;
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(820 + 300 * Math.sin(a)), y: Math.round(330 + 150 * Math.sin(2 * a)) });
    await sleep(16);
  }

  await phase(c, "drop");
  // From the hero down past the cards' pin (~ deployments section + 1500 px pin), ~720 px/s.
  const dropEnd = await evaluate(c, "Math.round(document.querySelector('#pipeline').getBoundingClientRect().top + scrollY - 200)");
  await wheel(c, dropEnd, 12, 16);
  await sleep(600);

  await phase(c, "pipeline");
  // Distance from here to the dashboard: the whole pinned pipeline scrolls past.
  const pipeEnd = await evaluate(c, "Math.round(document.querySelector('#metrics').getBoundingClientRect().top - 100)");
  await wheel(c, Math.max(pipeEnd, 1500), 12, 16);
  await sleep(600);
  await phase(c, "end");
  return label;
}

// ---------- analysis ----------

function frameStats(frames, phaseName) {
  const ts = frames.filter((f) => f[1] === phaseName).map((f) => f[0]);
  if (ts.length < 3) return null;
  const iv = ts.slice(1).map((t, i) => t - ts[i]);
  const dur = (ts.at(-1) - ts[0]) / 1000;
  const sorted = [...iv].sort((a, b) => a - b);
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const vsync = 1000 / 60;
  const dropped = iv.reduce((s, x) => s + Math.max(0, Math.round(x / vsync) - 1), 0);
  return {
    seconds: +dur.toFixed(1),
    fps: +(iv.length / dur).toFixed(1),
    dropped,
    expected: Math.round(dur * 60),
    jank25: iv.filter((x) => x > 25).length, // frames that visibly hitch (> 1.5 vsync)
    p95: +p(0.95).toFixed(1),
    max: +sorted.at(-1).toFixed(1),
  };
}

function traceStats(events, marks) {
  // Renderer main thread of the page: the CrRendererMain with the most task time.
  const threads = new Map();
  for (const e of events) if (e.ph === "M" && e.name === "thread_name" && e.args?.name === "CrRendererMain") threads.set(`${e.pid}:${e.tid}`, 0);
  for (const e of events) {
    const k = `${e.pid}:${e.tid}`;
    if (threads.has(k) && e.ph === "X" && e.name === "RunTask") threads.set(k, threads.get(k) + (e.dur ?? 0));
  }
  const main = [...threads.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const onMain = events.filter((e) => `${e.pid}:${e.tid}` === main && e.ph === "X");
  // Phase boundaries from the performance.mark() calls (blink.user_timing).
  const bounds = marks.sort((a, b) => a.ts - b.ts);
  const phaseOf = (ts) => {
    let p = "load";
    for (const m of bounds) if (ts >= m.ts) p = m.name.replace("pf:", "");
    return p;
  };
  const out = {};
  const bucket = (p) => (out[p] ??= { longTasks: 0, longMs: 0, gcMs: 0, inLong: {} });
  const tasks = onMain.filter((e) => e.name === "RunTask");
  for (const t of tasks) {
    const b = bucket(phaseOf(t.ts));
    if (t.dur > 50000) {
      b.longTasks++;
      b.longMs += t.dur / 1000;
      // What filled the long task: direct work events inside it, by name (+ JS function name).
      for (const e of onMain) {
        if (e === t || e.ts < t.ts || e.ts + (e.dur ?? 0) > t.ts + t.dur) continue;
        if (!/^(FunctionCall|EvaluateScript|v8\.compile|Layout|UpdateLayoutTree|Paint|PrePaint|Layerize|Commit|MinorGC|MajorGC|V8\.GC.*|ParseHTML|TimerFire|FireAnimationFrame|EventDispatch|HitTest|v8\.produceCache|DecodeImage|ScheduleStyleRecalculation|RunMicrotasks)$/.test(e.name)) continue;
        const d = e.args?.data;
        const key = e.name === "FunctionCall" && d ? `FunctionCall ${d.functionName || "(anon)"} @${(d.url || "").split("/").pop()}:${d.lineNumber ?? ""}` : e.name;
        b.inLong[key] = (b.inLong[key] ?? 0) + (e.dur ?? 0) / 1000;
      }
    }
  }
  for (const e of onMain) if (/^(MinorGC|MajorGC)$/.test(e.name) || /^V8\.GC_(SCAVENGER|MARK_COMPACTOR|MC_)$/.test(e.name)) bucket(phaseOf(e.ts)).gcMs += (e.dur ?? 0) / 1000;
  return out;
}

// ---------- main ----------

const { proc, profile } = launch();
let c;
try {
  c = await connect();
  await c.ready;
  await c.send("Page.enable");
  if (size) {
    const [width, height] = String(size).split("x").map(Number);
    await c.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  }
  await c.send("Runtime.enable");
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: RECORDER });
  await c.send("Emulation.setFocusEmulationEnabled", { enabled: true });

  if (warm) {
    console.error("warm-up run (untimed)…");
    await scenarioRun(c, "warmup");
  }

  const results = [];
  for (let r = 1; r <= runs; r++) {
    console.error(`run ${r}/${runs}…`);
    const chunks = [];
    let done = Promise.resolve();
    if (tracing) {
      done = new Promise((res) => {
        c.on("Tracing.dataCollected", (p) => chunks.push(...p.value));
        c.on("Tracing.tracingComplete", res);
      });
      await c.send("Tracing.start", {
        transferMode: "ReportEvents",
        traceConfig: {
          recordMode: "recordAsMuchAsPossible",
          includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink.user_timing", "toplevel"],
        },
      });
    }
    await scenarioRun(c, `run${r}`);
    const page = await evaluate(c, "JSON.stringify(window.__pf)");
    if (tracing) {
      await c.send("Tracing.end");
      await done;
    }
    const rec = JSON.parse(page);
    const marks = chunks.filter((e) => e.cat?.includes("blink.user_timing") && e.name?.startsWith("pf:"));
    const tr = traceStats(chunks, marks);
    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, `trace-run${r}.json`), JSON.stringify({ traceEvents: chunks }));
      writeFileSync(join(outDir, `page-run${r}.json`), page);
    }
    const phases = ["intro", "intro+", "idle", "drop", "pipeline"];
    const summary = {};
    for (const ph of phases) {
      const t = tr[ph] ?? { longTasks: 0, longMs: 0, gcMs: 0, inLong: {} };
      const loafs = rec.loafs.filter((l) => l.phase === ph);
      const scripts = {};
      for (const l of loafs) for (const s of l.scripts) {
        const k = `${s.fn || s.inv || "?"} @${s.src}`;
        scripts[k] = (scripts[k] ?? 0) + s.dur;
      }
      const gl = Object.entries(rec.gl).filter(([k]) => k.startsWith(ph + " "))
        .map(([k, [n, ms]]) => [k.slice(ph.length + 1), n, ms]);
      const draws = gl.filter(([k]) => k.startsWith("draw")).reduce((s, [, n]) => s + n, 0);
      summary[ph] = {
        frames: frameStats(rec.frames, ph),
        drawCalls: draws,
        glTopMs: gl.filter(([k]) => !k.startsWith("draw")).sort((a, b) => b[2] - a[2]).slice(0, 5)
          .map(([k, n, ms]) => `${Math.round(ms)}ms ${k} ×${n}`),
        slowGlCalls: rec.slowGl.filter((s) => s[3] === ph).slice(0, 12).map(([t, n, d]) => `@${t}ms ${n} ${d}ms`),
        longTasks: t.longTasks,
        longTaskMs: Math.round(t.longMs),
        gcMs: Math.round(t.gcMs),
        longFrames: loafs.length,
        topInLongTasks: Object.entries(t.inLong).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${Math.round(v)}ms ${k}`),
        topScriptsInLongFrames: Object.entries(scripts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${v}ms ${k}`),
      };
    }
    results.push(summary);
    console.log(JSON.stringify({ run: r, url, warm, boot: rec.boot, firstDraw: rec.firstDraw, ...summary }, null, 2));
  }
} finally {
  c?.close();
  proc.kill();
  await sleep(800);
  if (!keep) try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
