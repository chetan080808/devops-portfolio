// meshopt-compress every raw Blender export into public/models/ and report sizes.
// (meshopt over Draco: Draco's wasm decoder outweighed the bytes it saved; see docs/DECISIONS.md, D-11.)
//   blender/exports/<name>.raw.glb  →  public/models/<name>.glb
// Usage: npm run models            (all)
//        npm run models -- whale   (only names containing "whale")
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CLI = "node_modules/@gltf-transform/cli/bin/cli.js";
const SRC = "blender/exports";
const OUT = "public/models";
const PER_FILE_BUDGET = 500 * 1024;
const TOTAL_BUDGET = 3 * 1024 * 1024;

const filter = process.argv[2] ?? "";
const kb = (n) => `${(n / 1024).toFixed(2)} KB`;

if (!existsSync(SRC)) {
  console.error(`No ${SRC}/ folder — export from Blender first.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const raws = readdirSync(SRC).filter((f) => f.endsWith(".raw.glb") && f.includes(filter));
for (const raw of raws) {
  const name = raw.replace(".raw.glb", ".glb");
  execFileSync(process.execPath, [CLI, "meshopt", join(SRC, raw), join(OUT, name)], { stdio: "ignore" });
}

let total = 0;
console.log("\nmodel".padEnd(26) + "raw".padStart(12) + "meshopt".padStart(12) + "  budget");
for (const file of readdirSync(OUT).filter((f) => f.endsWith(".glb"))) {
  const size = statSync(join(OUT, file)).size;
  const rawPath = join(SRC, file.replace(".glb", ".raw.glb"));
  const raw = existsSync(rawPath) ? kb(statSync(rawPath).size) : "—";
  total += size;
  const ok = size <= PER_FILE_BUDGET ? "ok" : "OVER 500 KB";
  console.log(file.padEnd(25) + raw.padStart(12) + kb(size).padStart(12) + `  ${ok}`);
}
console.log(`\ntotal ${kb(total)} / 3 MB budget — ${total <= TOTAL_BUDGET ? "ok" : "OVER"}`);
