import type { Accent } from "@/types/content";
import { accentBg, accentText } from "@/lib/accent";
import { cn } from "@/lib/cn";

/** Small pulsing status indicator. Decorative — pair it with a text label. */
export function StatusDot({ accent = "success", pulse = true, className }: {
  accent?: Accent;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        accentBg[accent],
        accentText[accent],
        pulse && "animate-pulse-dot",
        className,
      )}
    />
  );
}
