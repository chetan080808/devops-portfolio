import { createElement, type ComponentPropsWithoutRef, type ElementType } from "react";
import { cn } from "@/lib/cn";

type GlassPanelProps<T extends ElementType> = {
  as?: T;
  glow?: boolean;
} & ComponentPropsWithoutRef<T>;

/** Glassmorphism surface with a 1px border and optional cyan glow. */
export function GlassPanel<T extends ElementType = "div">({
  as,
  glow = false,
  className,
  ...props
}: GlassPanelProps<T>) {
  // createElement instead of JSX: TS can't relate rest props to a generic tag in JSX. Callers stay typed.
  return createElement(as ?? "div", { ...props, className: cn("glass rounded-2xl", glow && "glow-edge", className) });
}
