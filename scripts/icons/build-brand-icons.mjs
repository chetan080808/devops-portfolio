#!/usr/bin/env node
/**
 * Builds the logos for the dashboard's skill tiles:
 * - public/icons/brands.svg: ONE sprite (<symbol> per logo, the glyph's fill inherits
 *   currentColor), one cached request for all logos, kept out of the HTML / RSC payload;
 * - src/components/sections/dashboard/brandIcons.ts: tile name → symbol id + brand colours.
 *
 *   node scripts/icons/build-brand-icons.mjs <aws-icon-package-dir>
 *
 * - Tools: Simple Icons (pinned SI_VERSION), fetched from jsDelivr.
 * - AWS services: the official AWS Architecture Icons package (download the zip from
 *   https://aws.amazon.com/architecture/icons/ and unzip it). 16 px service icons: the glyph is
 *   the path; the category-coloured tile is a rect whose fill is `var(--tile)` (transparent by
 *   default), so hovering shows the original icon (white glyph on its coloured tile).
 * Every name in site.ts's tag panels must be listed (an alias is fine): no fallback.
 * Credits: ASSETS.md.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SI_VERSION = "16.35.0";

/** Tile name (exactly as in site.ts) → Simple Icons slug */
const TOOLS = {
  Docker: "docker",
  // No Compose logo in either set: Compose is Docker's tool, so it shows the Docker logo.
  "Docker Compose": "docker",
  Kubernetes: "kubernetes",
  Nginx: "nginx",
  Terraform: "terraform",
  "GitHub Actions": "githubactions",
  Jenkins: "jenkins",
  Python: "python",
  // Boto3 = the AWS SDK for Python.
  Boto3: "python",
  Bash: "gnubash",
  PostgreSQL: "postgresql",
  MySQL: "mysql",
  Prometheus: "prometheus",
  Grafana: "grafana",
};

/** Tile name → AWS Architecture Service icon file (16 px) */
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

/** AWS symbols show the whole 24-unit tile minus a 2-unit margin (glyph = 16 of 20 units). */
const AWS_VIEWBOX = "2 2 20 20";

const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;
/** Arguments per path command (lower or upper case). */
const ARITY = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/**
 * Rounds a path's numbers to 3 decimals (24-unit grid: invisible, much smaller), parsing it as
 * commands. NOT a regex over numbers: arc flags are single digits that may be packed against the
 * next number ("a.19.19 0 00.19-.19" = flags 0, 0 then x .19); reading "00.19" as one number
 * dropped both flags and broke every logo with arcs (Docker, Kubernetes, PostgreSQL, …).
 */
export function roundPath(d) {
  const out = [];
  let i = 0;
  let cmd = null;
  let arg = 0;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
  };
  for (skip(); i < d.length; skip()) {
    const ch = d[i];
    if (/[a-zA-Z]/.test(ch)) {
      if (!(ch.toLowerCase() in ARITY)) throw new Error(`unknown path command ${ch}`);
      cmd = ch;
      arg = 0;
      out.push(ch);
      i++;
      continue;
    }
    if (!cmd) throw new Error("path data must start with a command");
    const lower = cmd.toLowerCase();
    const pos = arg % ARITY[lower];
    if (lower === "a" && (pos === 3 || pos === 4)) {
      if (!/[01]/.test(ch)) throw new Error(`bad arc flag at ${i}`);
      out.push(` ${ch}`);
      i++;
    } else {
      const m = NUMBER.exec(d.slice(i));
      if (!m) throw new Error(`bad number at ${i}: ${d.slice(i, i + 12)}`);
      const n = String(Math.round(Number(m[0]) * 1000) / 1000);
      // A separator is only needed when the next token could merge with the previous one.
      out.push(/^[A-Za-z]$/.test(out[out.length - 1]) || n.startsWith("-") ? n : ` ${n}`);
      i += m[0].length;
    }
    arg++;
  }
  return out.join("");
}

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
  return { source: path, d: roundPath(d[0]), tx: tx ? [Number(tx[1]), Number(tx[2])] : null, hex: (hex[1] ?? hex[2]).toUpperCase() };
}

async function toolIcon(slug) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@${SI_VERSION}/icons/${slug}.svg`);
  if (!res.ok) throw new Error(`simple-icons ${slug}: ${res.status}`);
  const svg = await res.text();
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)];
  if (paths.length !== 1 || !/viewBox="0 0 24 24"/.test(svg)) throw new Error(`simple-icons ${slug}: unexpected SVG`);
  return { svg, d: roundPath(paths[0][1]) };
}

/** Relative luminance (WCAG) of a hex colour. */
function luminance(hex) {
  const c = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: build-brand-icons.mjs <aws-icon-package-dir>");
  const meta = await (await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@${SI_VERSION}/data/simple-icons.json`)).json();
  const list = Array.isArray(meta) ? meta : meta.icons;
  const slugOf = (i) => i.slug ?? i.title.toLowerCase().replace(/[^a-z0-9]/g, "");

  const symbols = new Map(); // symbol id → markup
  const map = {}; // tile name → { id, fg, tile? }
  const sources = {}; // symbol id → original SVG (for scripts/icons/verify-brand-icons.mjs)

  for (const [name, slug] of Object.entries(TOOLS)) {
    const id = `si-${slug}`;
    if (!symbols.has(id)) {
      const { svg, d } = await toolIcon(slug);
      symbols.set(id, `<symbol id="${id}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`);
      sources[id] = { svg, viewBox: "0 0 24 24" };
    }
    const hex = list.find((i) => slugOf(i) === slug).hex.toUpperCase();
    // Hover colour: the brand colour, or white when it would vanish on the near-black background.
    map[name] = { id, fg: luminance(hex) < 0.03 ? "FFFFFF" : hex };
  }
  for (const [name, file] of Object.entries(AWS)) {
    const id = `aws-${file.replace(/^Arch_|_16\.svg$/g, "").toLowerCase()}`;
    const icon = awsIcon(dir, file);
    const attrs = icon.tx ? ` transform="translate(${icon.tx[0]} ${icon.tx[1]})"` : "";
    symbols.set(
      id,
      `<symbol id="${id}" viewBox="${AWS_VIEWBOX}"><rect x="2" y="2" width="20" height="20" style="fill:var(--tile,transparent);transition:fill .2s"/><path fill-rule="evenodd"${attrs} d="${icon.d}"/></symbol>`,
    );
    sources[id] = { svg: readFileSync(icon.source, "utf8"), viewBox: AWS_VIEWBOX };
    // Hover = the original icon: white glyph on its category-coloured tile.
    map[name] = { id, fg: "FFFFFF", tile: icon.hex };
  }

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg">${[...symbols.values()].join("")}</svg>\n`;
  writeFileSync("public/icons/brands.svg", sprite);
  if (process.env.ICON_SOURCES) writeFileSync(process.env.ICON_SOURCES, JSON.stringify(sources));

  const body = Object.entries(map)
    .map(([name, i]) => `  ${JSON.stringify(name)}: ${JSON.stringify(i).replace(/"(\w+)":/g, "$1: ")},`)
    .join("\n");
  const ts = `// GENERATED by scripts/icons/build-brand-icons.mjs — do not edit by hand.
// Symbols live in public/icons/brands.svg. Tools: Simple Icons ${SI_VERSION} (CC0; trademarks belong
// to their owners). AWS services: AWS Architecture Icons. Credits in ASSETS.md.

/** Bump with every regenerated sprite (cache busting). */
export const BRAND_SPRITE = "/icons/brands.svg?v=${Date.now().toString(36)}";

/**
 * Tile name (as written in site.ts) → sprite symbol + hover colours (hex, no "#"): \`fg\` = logo
 * colour, \`tile\` = AWS category colour behind it (the original AWS icon).
 */
export const brandIcons: Record<string, { id: string; fg: string; tile?: string }> = {
${body}
};
`;
  writeFileSync("src/components/sections/dashboard/brandIcons.ts", ts);
  console.log(`wrote ${symbols.size} symbols for ${Object.keys(map).length} names: sprite ${sprite.length} bytes`);
}

if (process.argv[1]?.endsWith("build-brand-icons.mjs")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
