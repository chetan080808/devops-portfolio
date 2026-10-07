import type { DashboardPanel } from "@/types/content";
import { accentHex, accentText } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { PanelFrame } from "./PanelFrame";

type PanelOf<K extends DashboardPanel["kind"]> = Extract<DashboardPanel, { kind: K }>;

function formatValue(value: number, decimals = 0, suffix = "") {
  return `${value.toFixed(decimals)}${suffix}`;
}

function BigValue({ text, accent }: { text: string; accent: keyof typeof accentText }) {
  return <p className={cn("font-mono text-4xl font-medium tracking-tight", accentText[accent])}>{text}</p>;
}

export function StatPanel({ panel }: { panel: PanelOf<"stat"> }) {
  return (
    <PanelFrame title={panel.title}>
      <div className="flex flex-1 flex-col justify-between gap-4">
        <BigValue text={formatValue(panel.value, panel.decimals, panel.suffix)} accent={panel.accent} />
        <p className="font-mono text-[0.7rem] text-muted">{panel.caption}</p>
      </div>
    </PanelFrame>
  );
}

function sparkPath(series: number[], w: number, h: number) {
  const step = w / (series.length - 1);
  return series.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`).join(" ");
}

export function SparklinePanel({ panel }: { panel: PanelOf<"sparkline"> }) {
  const W = 300;
  const H = 70;
  const line = sparkPath(panel.series, W, H);
  const color = accentHex[panel.accent];
  const gradId = `spark-${panel.id}`;

  return (
    <PanelFrame title={panel.title} className="sm:col-span-2">
      <div className="flex items-end justify-between gap-4">
        <BigValue text={formatValue(panel.value, panel.decimals, panel.suffix)} accent={panel.accent} />
        <p className="pb-1 text-right font-mono text-[0.7rem] text-muted">{panel.caption}</p>
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
        <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </PanelFrame>
  );
}

export function GaugePanel({ panel }: { panel: PanelOf<"gauge"> }) {
  const r = 40;
  const arc = Math.PI * r; // semicircle length
  const color = accentHex[panel.accent];

  return (
    <PanelFrame title={panel.title}>
      <div className="relative mx-auto w-full max-w-[11rem]">
        <svg viewBox="0 0 100 56" className="w-full" role="img" aria-label={`${panel.title}: ${panel.value}%`}>
          <path d="M10,50 A40,40 0 0 1 90,50" fill="none" stroke="rgb(148 163 184 / 0.12)" strokeWidth="7" strokeLinecap="round" />
          <path
            d="M10,50 A40,40 0 0 1 90,50"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={arc}
            strokeDashoffset={arc * (1 - panel.value / 100)}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <p className={cn("absolute inset-x-0 bottom-0 text-center font-mono text-2xl", accentText[panel.accent])}>
          {panel.value}%
        </p>
      </div>
      <p className="mt-3 text-center font-mono text-[0.7rem] text-muted">{panel.caption}</p>
    </PanelFrame>
  );
}

export function ListPanel({ panel }: { panel: PanelOf<"list"> }) {
  return (
    <PanelFrame title={panel.title} className={panel.wide ? "sm:col-span-2" : undefined}>
      <ul className={cn("grid gap-x-8 gap-y-2", panel.wide && "sm:grid-cols-2")}>
        {panel.items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 font-mono text-xs">
            <span className="flex items-center gap-2 text-fg">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: accentHex[item.accent] }}
                aria-hidden="true"
              />
              {item.label}
            </span>
            <span className="text-faint">{item.detail}</span>
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}
