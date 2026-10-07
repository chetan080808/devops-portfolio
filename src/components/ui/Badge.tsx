import type { ReactNode } from "react";
import type { Accent } from "@/types/content";
import { accentBorder, accentText } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { StatusDot } from "./StatusDot";

/** Monospace status pill, e.g. "● Running". */
export function Badge({ accent = "success", dot = true, children, className }: {
  accent?: Accent;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-white/[0.02] px-2.5 py-0.5 font-mono text-[0.7rem] tracking-wide",
        accentBorder[accent],
        accentText[accent],
        className,
      )}
    >
      {dot && <StatusDot accent={accent} />}
      {children}
    </span>
  );
}
