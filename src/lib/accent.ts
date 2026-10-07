import type { Accent } from "@/types/content";

/** Static Tailwind class maps per accent so classes survive purging. */
export const accentText: Record<Accent, string> = {
  cyan: "text-cyan",
  violet: "text-violet",
  success: "text-success",
  warning: "text-warning",
};

export const accentBg: Record<Accent, string> = {
  cyan: "bg-cyan",
  violet: "bg-violet",
  success: "bg-success",
  warning: "bg-warning",
};

export const accentBorder: Record<Accent, string> = {
  cyan: "border-cyan/30",
  violet: "border-violet/30",
  success: "border-success/30",
  warning: "border-warning/30",
};

export const accentHex: Record<Accent, string> = {
  cyan: "#22d3ee",
  violet: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
};
