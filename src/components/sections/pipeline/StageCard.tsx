import type { Milestone } from "@/types/content";

export function StageCard({ milestone, index, total }: { milestone: Milestone; index: number; total: number }) {
  return (
    <li className="relative flex gap-5 md:flex-col md:gap-0">
      {/* node on the pipeline rail */}
      <div className="relative z-10 flex flex-col items-center md:mb-6 md:flex-row">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-success/40 bg-bg font-mono text-sm text-success shadow-[0_0_24px_-4px_rgb(34_197_94/0.6)]">
          ✓
        </span>
      </div>

      <article className="glass flex-1 rounded-2xl p-5 transition-colors duration-500 hover:border-success/30">
        <p className="label-mono flex items-center justify-between gap-2">
          <span>
            stage {index + 1}/{total}
          </span>
          <span className="text-success normal-case">{milestone.stage}</span>
        </p>
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg">{milestone.title}</h3>
        <p className="mt-1 font-mono text-xs text-cyan">
          {milestone.org} <span className="text-faint">· {milestone.period}</span>
        </p>
        <p className="mt-3 text-sm text-muted">{milestone.summary}</p>
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {milestone.highlights.map((h) => (
            <li key={h} className="flex gap-2 font-mono text-[0.72rem] text-muted">
              <span className="text-success" aria-hidden="true">
                [ OK ]
              </span>
              {h}
            </li>
          ))}
        </ul>
      </article>
    </li>
  );
}
