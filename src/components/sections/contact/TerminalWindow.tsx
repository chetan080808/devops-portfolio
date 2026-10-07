import type { ReactNode } from "react";

/** Terminal window chrome (title bar + mono body). */
export function TerminalWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass glow-edge overflow-hidden rounded-2xl bg-bg-raised/80">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
        </span>
        <p className="flex-1 truncate text-center font-mono text-xs text-faint">{title}</p>
        <span className="w-10" aria-hidden="true" />
      </div>
      <div className="min-h-[22rem] p-5 font-mono text-[0.8rem] leading-relaxed sm:p-6">{children}</div>
    </div>
  );
}
