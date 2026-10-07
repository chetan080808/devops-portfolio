import type { ComponentPropsWithoutRef, ElementType } from "react";
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
  const Tag = as ?? "div";
  return <Tag className={cn("glass rounded-2xl", glow && "glow-edge", className)} {...props} />;
}
