import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan text-bg hover:bg-[#67e8f9] shadow-[0_0_0_1px_rgb(34_211_238/0.5),0_10px_40px_-10px_rgb(34_211_238/0.6)]",
  ghost: "border border-line-strong text-fg hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan",
};

/** Anchor styled as a button (all CTAs on this site are links). */
export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentPropsWithoutRef<"a"> & { variant?: Variant }) {
  return (
    <a
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-mono text-sm font-medium transition-all duration-300 ease-premium",
        "hover:-translate-y-px active:translate-y-0 active:scale-[0.98] active:duration-75 motion-reduce:transform-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
