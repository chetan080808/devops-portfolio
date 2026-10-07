import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** Standard page section with consistent gutters and max width. */
export function Section({ className, children, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn("relative px-4 py-14 sm:px-6 md:py-20", className)} {...props}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}
