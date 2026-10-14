#!/usr/bin/env node
/**
 * Checks that every symbol in public/icons/brands.svg draws exactly its original logo.
 *
 *   ICON_SOURCES=<tmp>/sources.json node scripts/icons/build-brand-icons.mjs <aws-dir>
 *   node scripts/icons/verify-brand-icons.mjs <tmp>/sources.json [--out=<dir>]
 *
 * In a headless Chrome, each symbol (as used on the site, via <use>) and its original SVG file
 * are rasterised at SIZE px onto a canvas, and their pixels compared. Tools: black glyph on
 * white. AWS: the original icon (white glyph on its coloured tile, cropped to the symbol's
 * viewBox) vs the symbol with `--tile` set to the same colour. Fails when more than MAX_DIFF of
 * the pixels differ by more than TOLERANCE (anti-aliasing of rounded coordinates only).
 * Writes a contact sheet (symbol | original per row) when --out is given.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SIZE = 96;
const TOLERANCE = 96; // per channel, 0–255
const MAX_DIFF = 0.004; // share of pixels

const [sourcesFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const outDir = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
const sources = JSON.parse(readFileSync(sourcesFile, "utf8"));
const sprite = readFileSync("public/icons/brands.svg", "utf8");
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9336;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "pf-icons-"))}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
  } catch {}
  await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const x = JSON.parse(m.data);
  if (x.id) pending.get(x.id)?.(x);
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

// Runs in the page: returns per-symbol diff share + a PNG contact sheet.
const pageScript = async (spriteText, sources, SIZE, TOLERANCE) => {
  const symbols = new DOMParser().parseFromString(spriteText, "image/svg+xml").querySelectorAll("symbol");
  const raster = (svgText) =>
    new Promise((resolve, reject) => {
      const img = new Image(SIZE, SIZE);
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = SIZE;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        resolve(c);
      };
      img.onerror = reject;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
    });
  const sheet = document.createElement("canvas");
  sheet.width = SIZE * 2 + 12;
  sheet.height = (SIZE + 8) * symbols.length;
  const sctx = sheet.getContext("2d");
  const results = [];
  let row = 0;
  for (const sym of symbols) {
    const src = sources[sym.id];
    const vb = sym.getAttribute("viewBox");
    const aws = sym.id.startsWith("aws-");
    const tile = aws ? /fill="#([0-9A-Fa-f]{6})"/.exec(src.svg.replace(/<path[\s\S]*$/, ""))?.[1] : null;
    const style = aws ? `color:#fff;--tile:#${tile}` : "color:#000";
    const mine = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${SIZE}" height="${SIZE}" style="${style}"><defs>${sym.outerHTML}</defs><use href="#${sym.id}" width="${SIZE}" height="${SIZE}" fill="currentColor"/></svg>`;
    // Original: same viewBox crop and size; Simple Icons paths drawn black.
    const orig = src.svg
      .replace(/<\?xml[^>]*>/, "")
      .replace(/<svg\b[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="${vb}">`);
    const a = await raster(mine);
    const b = await raster(orig);
    const da = a.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
    const db = b.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
    let diff = 0;
    for (let p = 0; p < da.length; p += 4) {
      if (Math.max(Math.abs(da[p] - db[p]), Math.abs(da[p + 1] - db[p + 1]), Math.abs(da[p + 2] - db[p + 2])) > TOLERANCE) diff++;
    }
    results.push({ id: sym.id, diff: diff / (SIZE * SIZE) });
    sctx.drawImage(a, 0, row * (SIZE + 8));
    sctx.drawImage(b, SIZE + 12, row * (SIZE + 8));
    row++;
  }
  return { results, sheet: sheet.toDataURL("image/png") };
};

try {
  const expr = `(${pageScript})(${JSON.stringify(sprite)}, ${JSON.stringify(sources)}, ${SIZE}, ${TOLERANCE})`;
  const res = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (res.result?.exceptionDetails || res.error) throw new Error(JSON.stringify(res.result?.exceptionDetails ?? res.error));
  const { results, sheet } = res.result.result.value;
  let failed = 0;
  for (const r of results) {
    const ok = r.diff <= MAX_DIFF;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${r.id.padEnd(48)} ${(r.diff * 100).toFixed(2)}% pixels differ`);
  }
  if (outDir) {
    const file = join(outDir, "brand-icons-sheet.png");
    writeFileSync(file, Buffer.from(sheet.split(",")[1], "base64"));
    console.log(`contact sheet: ${file}`);
  }
  console.log(failed ? `${failed} of ${results.length} symbols FAILED` : `all ${results.length} symbols match their originals`);
  process.exitCode = failed ? 1 : 0;
} finally {
  ws.close();
  proc.kill();
}
