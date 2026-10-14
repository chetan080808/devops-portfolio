#!/usr/bin/env node
/**
 * Builds the monochrome logos for the dashboard's tag chips:
 * - public/icons/brands.svg: ONE sprite (<symbol> per icon, fill inherits currentColor), one
 *   cached request for all icons, kept out of the HTML / RSC payload;
 * - src/components/sections/dashboard/brandIcons.ts: chip name → symbol id + brand colour.
 *
 *   node scripts/icons/build-brand-icons.mjs <aws-icon-package-dir>
 *
 * - Tools: Simple Icons (pinned SI_VERSION), fetched from jsDelivr.
 * - AWS services: the official AWS Architecture Icons package (download the zip from
 *   https://aws.amazon.com/architecture/icons/ and unzip it). Only the white glyph of the 16 px
 *   service icon is kept (the coloured background tile is dropped); its category colour is kept
 *   as the hover colour.
 * Names without an icon in either set are simply left out: the chip falls back to a dot.
 * Credits: ASSETS.md.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SI_VERSION = "16.35.0";

/** Chip name (exactly as in site.ts) → Simple Icons slug */
const TOOLS = {
  Docker: "docker",
  Kubernetes: "kubernetes",
  Nginx: "nginx",
  Terraform: "terraform",
  "GitHub Actions": "githubactions",
  Jenkins: "jenkins",
  Python: "python",
  Bash: "gnubash",
  PostgreSQL: "postgresql",
  MySQL: "mysql",
  Prometheus: "prometheus",
  Grafana: "grafana",
};

/** Chip name → AWS Architecture Service icon file (16 px) */
const AWS = {
  EC2: "Arch_Amazon-EC2_16.svg",
  S3: "Arch_Amazon-Simple-Storage-Service_16.svg",
  VPC: "Arch_Amazon-Virtual-Private-Cloud_16.svg",
  IAM: "Arch_AWS-Identity-and-Access-Management_16.svg",
  RDS: "Arch_Amazon-RDS_16.svg",
  EKS: "Arch_Amazon-Elastic-Kubernetes-Service_16.svg",
  Lambda: "Arch_AWS-Lambda_16.svg",
  "Step Functions": "Arch_AWS-Step-Functions_16.svg",
  EventBridge: "Arch_Amazon-EventBridge_16.svg",
  DynamoDB: "Arch_Amazon-DynamoDB_16.svg",
  CloudFront: "Arch_Amazon-CloudFront_16.svg",
  "API Gateway": "Arch_Amazon-API-Gateway_16.svg",
  "Route 53": "Arch_Amazon-Route-53_16.svg",
  "Secrets Manager": "Arch_AWS-Secrets-Manager_16.svg",
  KMS: "Arch_AWS-Key-Management-Service_16.svg",
  SES: "Arch_Amazon-Simple-Email-Service_16.svg",
  SNS: "Arch_Amazon-Simple-Notification-Service_16.svg",
  "ELB/ALB": "Arch_Elastic-Load-Balancing_16.svg",
  CloudWatch: "Arch_Amazon-CloudWatch_16.svg",
  CloudFormation: "Arch_AWS-CloudFormation_16.svg",
  CodePipeline: "Arch_AWS-CodePipeline_16.svg",
  CodeBuild: "Arch_AWS-CodeBuild_16.svg",
};

/** Round every number in a path to 2 decimals (24-unit grid: invisible, ~40% smaller). */
const round = (d) => d.replace(/-?\d*\.\d+/g, (n) => String(Math.round(Number(n) * 100) / 100));

function findFile(dir, name) {
  for (const entry of readdirSync(dir)) {
    if (entry === "__MACOSX") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      const hit = findFile(p, name);
      if (hit) return hit;
    } else if (entry === name && p.includes("Architecture-Service-Icons")) return p;
  }
  return null;
}

function awsIcon(dir, file) {
  const path = findFile(dir, file);
  if (!path) throw new Error(`AWS icon not found: ${file}`);
  const svg = readFileSync(path, "utf8");
  const hex = /<rect[^>]*fill="#([0-9A-Fa-f]{6})"|fill="#([0-9A-Fa-f]{6})"[^>]*>\s*<rect/.exec(svg);
  const d = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (d.length !== 1) throw new Error(`${file}: expected one glyph path, found ${d.length}`);
  const tx = /transform="translate\(([-\d.]+),\s*([-\d.]+)\)"/.exec(svg);
  return {
    // The glyph sits in 4..20 of the 24-unit tile: crop to it so it matches Simple Icons' size.
    vb: "3.5 3.5 17 17",
    d: round(d[0]),
    ...(tx ? { tx: [Number(tx[1]), Number(tx[2])] } : {}),
    evenodd: true,
    hex: (hex[1] ?? hex[2]).toUpperCase(),
  };
}

async function toolIcon(slug) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@${SI_VERSION}/icons/${slug}.svg`);
  if (!res.ok) throw new Error(`simple-icons ${slug}: ${res.status}`);
  const svg = await res.text();
  const d = /<path d="([^"]+)"/.exec(svg)[1];
  return { vb: "0 0 24 24", d: round(d) };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: build-brand-icons.mjs <aws-icon-package-dir>");
  const meta = await (await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@${SI_VERSION}/data/simple-icons.json`)).json();
  const list = Array.isArray(meta) ? meta : meta.icons;
  const out = {};
  for (const [name, slug] of Object.entries(TOOLS)) {
    const entry = list.find((i) => i.slug === slug || i.title.toLowerCase().replace(/[^a-z0-9]/g, "") === slug);
    out[name] = { ...(await toolIcon(slug)), hex: entry.hex.toUpperCase() };
  }
  for (const [name, file] of Object.entries(AWS)) out[name] = awsIcon(dir, file);

  const id = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const symbols = Object.entries(out).map(([name, i]) => {
    const attrs = `${i.evenodd ? ' fill-rule="evenodd"' : ""}${i.tx ? ` transform="translate(${i.tx[0]} ${i.tx[1]})"` : ""}`;
    return `<symbol id="${id(name)}" viewBox="${i.vb}"><path${attrs} d="${i.d}"/></symbol>`;
  });
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>\n`;
  writeFileSync("public/icons/brands.svg", sprite);

  const body = Object.entries(out)
    .map(([name, i]) => `  ${JSON.stringify(name)}: { id: "${id(name)}", hex: "${i.hex}" },`)
    .join("\n");
  const ts = `// GENERATED by scripts/icons/build-brand-icons.mjs — do not edit by hand.
// Symbols live in public/icons/brands.svg. Tools: Simple Icons ${SI_VERSION} (CC0; trademarks belong
// to their owners). AWS services: AWS Architecture Icons (glyph only; hex = category colour).
// Credits in ASSETS.md.

/** Bump with every regenerated sprite (cache busting). */
export const BRAND_SPRITE = "/icons/brands.svg?v=${Date.now().toString(36)}";

/** Chip name (as written in site.ts) → sprite symbol id + brand colour (no "#"). Names not listed fall back to a dot. */
export const brandIcons: Record<string, { id: string; hex: string }> = {
${body}
};
`;
  writeFileSync("src/components/sections/dashboard/brandIcons.ts", ts);
  console.log(`wrote ${symbols.length} icons: sprite ${sprite.length} bytes, map ${ts.length} bytes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
