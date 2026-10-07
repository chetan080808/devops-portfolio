import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Grafana-style panel chrome: title bar + body. */
export function PanelFrame({ title, className, children }: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={cn("glass flex flex-col rounded-xl", className)}>
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h3 className="font-mono text-xs text-fg">{title}</h3>
        <span className="font-mono text-[0.65rem] text-faint" aria-hidden="true">
          ⋮
        </span>
      </header>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </article>
  );
}
