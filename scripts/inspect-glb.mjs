// Print a GLB's animations (channels, targets, keyframe ranges) and node pivots.
// Usage: node scripts/inspect-glb.mjs public/models/shipping_container.glb
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/inspect-glb.mjs <file.glb>");
  process.exit(1);
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });
const doc = await io.read(file);
const root = doc.getRoot();

const fmt = (arr) => `[${Array.from(arr, (v) => +v.toFixed(3)).join(", ")}]`;

console.log(`\n${file}`);
const asset = root.getAsset();
console.log(`asset: generator=${asset.generator ?? "—"} copyright=${asset.copyright ?? "—"} extras=${JSON.stringify(root.getExtras())}`);

let totalTris = 0;
console.log(`meshes: ${root.listMeshes().length}`);
for (const mesh of root.listMeshes()) {
  const tris = mesh.listPrimitives().reduce((sum, p) => {
    const idx = p.getIndices();
    return sum + (idx ? idx.getCount() : p.getAttribute("POSITION").getCount()) / 3;
  }, 0);
  totalTris += tris;
  console.log(`  ${mesh.getName().padEnd(28)} ${mesh.listPrimitives().length} prim  ${tris} tris`);
}
console.log(`triangles total: ${totalTris}`);
console.log(`materials: ${root.listMaterials().map((m) => m.getName()).join(", ") || "—"}`);
console.log(`textures: ${root.listTextures().length}  skins: ${root.listSkins().length}`);
for (const scene of root.listScenes()) {
  const { min, max } = getBounds(scene);
  console.log(`scene bounds: min=${fmt(min)} max=${fmt(max)} size=${fmt(max.map((v, i) => v - min[i]))}`);
}

console.log(`animations: ${root.listAnimations().length}`);
for (const anim of root.listAnimations()) {
  console.log(`  "${anim.getName()}"`);
  for (const ch of anim.listChannels()) {
    const s = ch.getSampler();
    const times = s.getInput().getArray();
    const vals = s.getOutput().getArray();
    const n = s.getOutput().getElementSize();
    console.log(
      `    ${ch.getTargetNode()?.getName()}.${ch.getTargetPath()}  ${s.getInterpolation()}  ` +
        `${times.length} keys  t=${times[0].toFixed(2)}→${times[times.length - 1].toFixed(2)}s  ` +
        `first=${fmt(vals.slice(0, n))} last=${fmt(vals.slice(-n))}`,
    );
  }
}

console.log("nodes (translation = pivot in parent space):");
for (const node of root.listNodes()) {
  const parent = node.listParents().find((p) => p.propertyType === "Node");
  const extra = [node.getSkin() ? `skin(${node.getSkin().listJoints().length} joints)` : "", parent ? `parent=${parent.getName()}` : ""]
    .filter(Boolean)
    .join(" ");
  console.log(`  ${node.getName().padEnd(28)} t=${fmt(node.getTranslation())} r=${fmt(node.getRotation())} ${extra}`);
}
