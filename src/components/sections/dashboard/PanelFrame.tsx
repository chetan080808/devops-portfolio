import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Grafana-style panel chrome: title bar + body. */
export function PanelFrame({ title, className, children }: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article data-panel className={cn("glass flex flex-col rounded-xl", className)}>
      <header className="relative flex items-center justify-between gap-2 border-b border-line px-3 py-2 sm:px-4 sm:py-2.5">
        {/* Grafana-style query loading bar, swept once when the panel enters (DashboardScroll) */}
        <span
          data-panel-loader
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-gradient-to-r from-cyan/0 via-cyan to-cyan/0"
        />
        <h3 className="font-mono text-[0.68rem] leading-snug text-fg sm:text-xs">{title}</h3>
        <span className="hidden font-mono text-[0.65rem] text-faint sm:inline" aria-hidden="true">
          ⋮
        </span>
      </header>
      <div className="flex flex-1 flex-col p-3 sm:p-4">{children}</div>
    </article>
  );
}
