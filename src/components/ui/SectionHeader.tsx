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
    <header className="mb-10 max-w-2xl md:mb-12">
      <p className="label-mono mb-4 flex items-center gap-3">
        <span className="text-cyan">{index}</span>
        <span className="h-px w-8 bg-line-strong" aria-hidden="true" />
        <span className="normal-case tracking-normal">$ {label}</span>
      </p>
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance text-fg md:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">{children}</p>}
    </header>
  );
}
