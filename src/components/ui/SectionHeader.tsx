import type { ReactNode } from "react";

/** Section heading with a monospace "kubectl-style" label above it. */
export function SectionHeader({ id, index, label, title, children }: {
  id?: string;
  /** e.g. "02" */
  index: string;
  /** e.g. "kubectl get deployments" */
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-7 max-w-2xl sm:mb-10 md:mb-12">
      <p className="label-mono mb-3 flex items-center gap-2 whitespace-nowrap sm:mb-4 sm:gap-3">
        <span className="text-cyan">{index}</span>
        {/* Decorative rule: phones drop it so the longest command fits one line at 360 px */}
        <span className="hidden h-px w-8 shrink-0 bg-line-strong sm:block" aria-hidden="true" />
        <span className="min-w-0 truncate normal-case tracking-normal">$ {label}</span>
      </p>
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance text-fg md:text-5xl">{title}</h2>
      {children && <p className="mt-3 text-[0.95rem] leading-relaxed text-muted sm:mt-4 sm:text-base md:text-lg">{children}</p>}
    </header>
  );
}
