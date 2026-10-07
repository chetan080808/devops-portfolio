import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Neutral tech-stack chip. */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-white/[0.03] px-2 py-0.5 font-mono text-[0.7rem] text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
