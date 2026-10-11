import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { site } from "@/content/site";

/** Share card (1200×630), generated at build time from site.ts: name, title, boot log + the hero whale. */
export const alt = `${site.profile.name} — ${site.profile.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  bg: "#05070d",
  fg: "#e6edf7",
  muted: "#9ba6bc",
  faint: "#7d89a3",
  cyan: "#22d3ee",
  violet: "#8b5cf6",
  success: "#22c55e",
  line: "rgba(148,163,184,0.16)",
};

/**
 * The site's fonts as TTF (satori can't read woff2), subset to the card's text. The build already
 * fetches these families from Google Fonts (next/font); without network the card falls back to
 * the default font instead of failing the build.
 */
async function googleFont(family: string, weight: 400 | 600, text: string) {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const data = Buffer.from(await (await fetch(src)).arrayBuffer()).toString("base64");
    return { name: family, weight, data };
  } catch {
    return null;
  }
}

/** Fonts + artwork, resolved once at build (cached as plain base64 strings). */
async function loadAssets(nameText: string, monoText: string) {
  "use cache";
  cacheLife("max");
  // Read from src/ (not public/): fine at build; a later revalidation without src/ just drops the art.
  const whale = await readFile(join(process.cwd(), "src/app/og/whale.png")).catch(() => null);
  const fonts = await Promise.all([googleFont("Space Grotesk", 600, nameText), googleFont("JetBrains Mono", 400, monoText)]);
  return { whale: whale && `data:image/png;base64,${whale.toString("base64")}`, fonts: fonts.filter((f) => f !== null) };
}

export default async function OpengraphImage() {
  const { profile, hero, boot } = site;
  const command = `$ ${boot.command}`;
  const ready = `[ OK ] ${boot.readyLine}`;
  const roleKey = "role=";
  const roleValue = `"${profile.title}"`;

  const assets = await loadAssets(profile.name, hero.eyebrow + command + ready + roleKey + roleValue);
  const whaleSrc = assets.whale;
  const fonts = assets.fonts.map((f) => ({ name: f.name, weight: f.weight, style: "normal" as const, data: Buffer.from(f.data, "base64") }));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: C.bg,
          backgroundImage:
            "radial-gradient(ellipse 55% 60% at 74% 48%, rgba(34,211,238,0.13), transparent 70%), linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 64px 64px, 64px 64px",
          fontFamily: "JetBrains Mono",
          color: C.fg,
        }}
      >
        {/* top rail */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundImage: `linear-gradient(90deg, transparent, ${C.cyan} 35%, ${C.violet} 75%, transparent)`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 76px", width: 690 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 12,
              padding: "8px 18px",
              border: `1px solid ${C.line}`,
              borderRadius: 999,
              fontSize: 20,
              color: C.muted,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: C.success, boxShadow: `0 0 12px ${C.success}` }} />
            {hero.eyebrow}
          </div>

          <div
            style={{
              marginTop: 34,
              fontFamily: "Space Grotesk",
              fontWeight: 600,
              fontSize: profile.name.length > 16 ? 76 : 92,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              backgroundImage: `linear-gradient(100deg, ${C.fg} 10%, ${C.cyan} 55%, ${C.violet} 95%)`,
              backgroundClip: "text",
              color: "transparent",
              paddingBottom: 8,
            }}
          >
            {profile.name}
          </div>

          <div style={{ display: "flex", marginTop: 22, fontSize: 28, color: C.cyan }}>
            <span style={{ color: C.faint }}>{roleKey}</span>
            {roleValue}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 56,
              padding: "20px 24px",
              border: `1px solid ${C.line}`,
              borderRadius: 16,
              backgroundColor: "rgba(15,20,33,0.75)",
              fontSize: 21,
            }}
          >
            <div style={{ display: "flex", color: C.fg }}>{command}</div>
            <div style={{ display: "flex", color: C.success }}>{ready}</div>
          </div>
        </div>

        {whaleSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- satori renders plain <img>
          <img src={whaleSrc} width={760} height={760} alt="" style={{ position: "absolute", right: -46, top: -114 }} />
        )}
      </div>
    ),
    { ...size, fonts },
  );
}
