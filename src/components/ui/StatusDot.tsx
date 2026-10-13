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
        "relative inline-block size-2 shrink-0 rounded-full",
        accentBg[accent],
        accentText[accent],
        // Halo = a ::after ring scaled + faded (compositor-only); a box-shadow pulse repainted.
        pulse &&
          "animate-pulse-dot after:absolute after:inset-0 after:animate-pulse-ring after:rounded-full after:bg-current after:content-['']",
        className,
      )}
    />
  );
}
