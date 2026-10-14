import { Fragment, type CSSProperties } from "react";
import type { Accent, DashboardPanel } from "@/types/content";
import { accentHex, accentText } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { BRAND_SPRITE, brandIcons } from "./brandIcons";
import { PanelFrame } from "./PanelFrame";
import { TileFlash } from "./TileFlash";

type PanelOf<K extends DashboardPanel["kind"]> = Extract<DashboardPanel, { kind: K }>;

// The grid is 2 columns from 0 px (wide panels span both) and 4 from lg, where a wide panel takes
// 3 columns next to one stat panel (zigzag, see site.ts order): side by side with a 2-column tile
// panel, the stat panels stretched far past their content.
const wideClass = (wide?: boolean) => (wide ? "col-span-2 lg:col-span-3" : undefined);

function formatValue(value: number, decimals = 0, suffix = "", prefix = "") {
  return `${prefix}${value.toFixed(decimals)}${suffix}`;
}

/** Big metric number, or Grafana-style "No data" when the value isn't filled in yet. */
function BigValue({ value, decimals, prefix, suffix, accent }: {
  value: number | null;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  accent: Accent;
}) {
  if (value === null) {
    return <p className="font-mono text-base text-faint sm:text-lg">No data</p>;
  }
  return (
    // Real values only: DashboardScroll counts these up from 0 (the server HTML is the final value).
    <p
      data-countup
      data-value={value}
      data-decimals={decimals ?? 0}
      data-prefix={prefix ?? ""}
      data-suffix={suffix ?? ""}
      className={cn("font-mono text-[1.7rem] leading-tight font-medium tracking-tight sm:text-4xl", accentText[accent])}
    >
      {formatValue(value, decimals, suffix, prefix)}
    </p>
  );
}

export function StatPanel({ panel }: { panel: PanelOf<"stat"> }) {
  return (
    <PanelFrame title={panel.title} className={wideClass(panel.wide)}>
      <div className="flex flex-1 flex-col justify-between gap-3 sm:gap-4">
        <BigValue value={panel.value} decimals={panel.decimals} prefix={panel.prefix} suffix={panel.suffix} accent={panel.accent} />
        <p className="font-mono text-[0.66rem] leading-snug text-muted sm:text-[0.7rem]">{panel.caption}</p>
      </div>
    </PanelFrame>
  );
}

export function TextPanel({ panel }: { panel: PanelOf<"text"> }) {
  return (
    // Text panels share the last lg row two by two.
    <PanelFrame title={panel.title} className={cn(wideClass(panel.wide), "lg:col-span-2")}>
      <div className="flex flex-1 flex-col justify-between gap-3 sm:gap-4">
        <p className={cn("flex items-start gap-2 text-[0.95rem] leading-snug font-medium sm:text-lg", accentText[panel.accent])}>
          <span
            className="mt-[0.45rem] size-1.5 shrink-0 rounded-full sm:mt-2"
            style={{ backgroundColor: accentHex[panel.accent] }}
            aria-hidden="true"
          />
          {panel.headline}
        </p>
        <p className="font-mono text-[0.66rem] leading-snug text-muted sm:text-[0.7rem]">{panel.caption}</p>
      </div>
    </PanelFrame>
  );
}

function sparkPath(series: number[], w: number, h: number) {
  const step = w / (series.length - 1);
  return series
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`)
    .join(" ");
}

export function SparklinePanel({ panel }: { panel: PanelOf<"sparkline"> }) {
  const W = 300;
  const H = 70;
  const color = accentHex[panel.accent];
  const gradId = `spark-${panel.id}`;
  const hasSeries = panel.series !== null && panel.series.length > 1;
  const line = hasSeries ? sparkPath(panel.series!, W, H) : "";

  return (
    <PanelFrame title={panel.title} className={wideClass(panel.wide)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <BigValue value={panel.value} decimals={panel.decimals} prefix={panel.prefix} suffix={panel.suffix} accent={panel.accent} />
        <p className="pb-1 text-right font-mono text-[0.66rem] leading-snug text-muted sm:text-[0.7rem]">{panel.caption}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-4 h-20 w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((y) => (
          <line key={y} x1="0" x2={W} y1={H * y} y2={H * y} stroke="rgb(148 163 184 / 0.08)" strokeDasharray="2 4" />
        ))}
        {hasSeries ? (
          <>
            <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${gradId})`} />
            <path data-spark-line d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <line
            x1="0"
            x2={W}
            y1={H - 1}
            y2={H - 1}
            stroke={color}
            strokeOpacity="0.35"
            strokeDasharray="4 6"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </PanelFrame>
  );
}

export function GaugePanel({ panel }: { panel: PanelOf<"gauge"> }) {
  const r = 40;
  const arc = Math.PI * r; // semicircle length
  const color = accentHex[panel.accent];
  const value = panel.value ?? 0;

  return (
    <PanelFrame title={panel.title} className={wideClass(panel.wide)}>
      <div className="relative mx-auto w-full max-w-[11rem]">
        <svg
          viewBox="0 0 100 56"
          className="w-full"
          role="img"
          aria-label={panel.value === null ? `${panel.title}: no data` : `${panel.title}: ${panel.value}%`}
        >
          <path d="M10,50 A40,40 0 0 1 90,50" fill="none" stroke="rgb(148 163 184 / 0.12)" strokeWidth="7" strokeLinecap="round" />
          {panel.value !== null && (
            <path
              d="M10,50 A40,40 0 0 1 90,50"
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={arc}
              strokeDashoffset={arc * (1 - value / 100)}
              data-gauge-arc
              data-arc={arc}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
          )}
        </svg>
        <p
          className={cn(
            "absolute inset-x-0 bottom-0 text-center font-mono",
            panel.value === null ? "text-sm text-faint" : cn("text-xl sm:text-2xl", accentText[panel.accent]),
          )}
        >
          {panel.value === null ? "No data" : `${panel.value}%`}
        </p>
      </div>
      <p className="mt-2 text-center font-mono sm:mt-3 text-[0.66rem] leading-snug text-muted sm:text-[0.7rem]">{panel.caption}</p>
    </PanelFrame>
  );
}

export function ListPanel({ panel }: { panel: PanelOf<"list"> }) {
  return (
    <PanelFrame title={panel.title} className={wideClass(panel.wide)}>
      <ul className={cn("grid gap-x-8 gap-y-2", panel.wide && "sm:grid-cols-2")}>
        {panel.items.map((item, i) => (
          <li key={`${item.label}-${i}`} data-list-item className="flex items-center justify-between gap-3 font-mono text-xs">
            <span className="flex items-center gap-2 text-fg">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: accentHex[item.accent] }}
                aria-hidden="true"
              />
              {item.label}
            </span>
            <span className="text-right text-muted">{item.detail}</span>
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}

/** Lets long names wrap at their camel-case joints only when needed ("Cloud|Formation"). */
function breakable(name: string) {
  const parts = name.split(/(?<=[a-z])(?=[A-Z])/);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

/**
 * Skill tile: the tool's / service's real logo (sprite symbol) above its name. Monochrome in the
 * panel accent; on hover (pointer devices) or a tap (`data-flash`, TileFlash) it shows its brand
 * colours: tools in their brand colour (white when that is too dark for the background), AWS
 * services as the original icon (white glyph on the category-coloured tile, via `--tile`).
 */
function SkillTile({ name, accent }: { name: string; accent: Accent }) {
  const icon = brandIcons[name];
  return (
    <li
      data-list-item
      data-tile
      className="group/tile flex min-w-0 flex-col items-center gap-1 rounded-lg border border-line bg-white/[0.02] px-0.5 pt-2 pb-1.5 sm:gap-1.5 sm:pt-2.5 sm:pb-2 transition-colors duration-200 hover:border-line-strong data-[flash=on]:border-line-strong"
    >
      {icon && (
        <svg
          aria-hidden="true"
          className={cn(
            "size-7 shrink-0 fill-current transition-colors duration-200 sm:size-8 [--tile:transparent]",
            accentText[accent],
            "group-hover/tile:text-(--fg) group-hover/tile:[--tile:var(--tile-on)]",
            "group-data-[flash=on]/tile:text-(--fg) group-data-[flash=on]/tile:[--tile:var(--tile-on)]",
          )}
          style={{ "--fg": `#${icon.fg}`, "--tile-on": icon.tile ? `#${icon.tile}` : "transparent" } as CSSProperties}
        >
          <use href={`${BRAND_SPRITE}#${icon.id}`} />
        </svg>
      )}
      <span className="w-full text-center text-[0.68rem] leading-tight text-muted">{breakable(name)}</span>
    </li>
  );
}

export function TagsPanel({ panel }: { panel: PanelOf<"tags"> }) {
  return (
    <PanelFrame title={panel.title} className={wideClass(panel.wide)}>
      {/* 4 tiles per row on phones, 6 / 8 from sm / md, 10 in the 3-column lg panel */}
      <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 sm:gap-2 md:grid-cols-8 lg:grid-cols-10">
        {panel.items.map((item) => (
          <SkillTile key={item} name={item} accent={panel.accent} />
        ))}
      </ul>
      {panel.caption && <p className="mt-3 font-mono text-[0.66rem] leading-snug text-muted sm:mt-4 sm:text-[0.7rem]">{panel.caption}</p>}
      <TileFlash />
    </PanelFrame>
  );
}
