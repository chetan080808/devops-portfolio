import type { Milestone } from "@/types/content";
import { cn } from "@/lib/cn";

function StageNode({ running }: { running: boolean }) {
  if (running) {
    return (
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-warning/50 bg-bg shadow-[0_0_24px_-4px_rgb(245_158_11/0.6)]">
        <span className="absolute inset-0 animate-ping rounded-full border border-warning/40" aria-hidden="true" />
        <span className="size-2.5 animate-pulse-dot rounded-full bg-warning text-warning" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-success/40 bg-bg font-mono text-sm text-success shadow-[0_0_24px_-4px_rgb(34_197_94/0.6)]"
      aria-hidden="true"
    >
      ✓
    </span>
  );
}

export function StageCard({ milestone, index, total }: { milestone: Milestone; index: number; total: number }) {
  const running = milestone.current === true;

  return (
    <li className="relative flex gap-5 md:flex-col md:gap-0" aria-current={running ? "step" : undefined}>
      <div className="relative z-10 flex flex-col items-center md:mb-6 md:flex-row">
        <StageNode running={running} />
      </div>

      <article
        className={cn(
          "glass flex-1 rounded-2xl p-5 transition-colors duration-500",
          running ? "border-warning/25 hover:border-warning/40" : "hover:border-success/30",
        )}
      >
        <p className="label-mono flex items-center justify-between gap-2">
          <span>
            stage {index + 1}/{total}
          </span>
          <span className={cn("normal-case", running ? "text-warning" : "text-success")}>
            {milestone.stage} · {running ? "running" : "passed"}
          </span>
        </p>
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg">{milestone.title}</h3>
        <p className="mt-1 font-mono text-xs text-cyan">
          {milestone.org} <span className="text-faint">· {milestone.period}</span>
        </p>
        <p className="mt-3 text-sm text-muted">{milestone.summary}</p>
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {milestone.highlights.map((h) => (
            <li key={h} className="flex gap-2 font-mono text-[0.72rem] text-muted">
              <span className={cn("shrink-0", running ? "text-warning" : "text-success")} aria-hidden="true">
                {running ? "[ .. ]" : "[ OK ]"}
              </span>
              {h}
            </li>
          ))}
        </ul>
      </article>
    </li>
  );
}
